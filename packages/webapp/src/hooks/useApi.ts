import { useQuery } from "@tanstack/react-query";
import { generateClient, post } from 'aws-amplify/api'
import { fetchAuthSession } from "aws-amplify/auth";
import { chatsByUserID } from "../graphql/queries";
import { createChat, deleteChat, resolverLambda } from "../graphql/mutations";
import { ChatInputType, QUERY_KEYS } from "../utils/types";

const client = generateClient();

export const postRest = async () => {
    console.log("Testing Rest POST API-->");
    try {
        const restOperation = post({
            apiName: 'rest-api',
            path: '/test',
            options: {
                headers: {
                    Authorization: (await fetchAuthSession()).tokens?.idToken?.toString() ?? ''
                },
                body: {
                    message: 'Mow the lawn'
                }
            }
        });

        const { body } = await restOperation.response;
        const response = await body.json();

        console.log('REST call succeeded');
        console.log(response);
        return response
    } catch (e) {
        console.log('REST call failed: ', e);
        return null
    }
}

export const postHTTP = async () => {
    console.log("Testing HTTP POST API-->");
    try {
        const restOperation = post({
            apiName: 'http-api',
            path: '/test',
            options: {
                headers: {
                    Authorization: (await fetchAuthSession()).tokens?.idToken?.toString() ?? ''
                },
                body: {
                    message: 'Mow the lawn'
                }
            }
        });

        const { body } = await restOperation.response;
        const response = await body.json();

        console.log('HTTP call succeeded');
        console.log(response);
        return response
    } catch (e) {
        console.log('HTTP call failed: ', e);
        return null
    }
}

/**
* GraphQL Mutation
* @param campaign 
* @returns 
*/

export const addChat = (input: ChatInputType) => client.graphql({
    query: createChat,
    variables: {
        input: {
            userID: input.userID,
            human: input.message,
            payload: JSON.stringify({ documents: input.documents })
        }
    }
})

export const removeChat = (chatID: string) => client.graphql({
    query: deleteChat,
    variables: {
        input: {
            id: chatID
        }
    }
})

export const listChatsByUserID = async (userID: string) => {
    const response = await client.graphql({
        query: chatsByUserID,
        variables: {
            userID
        }
    });

    return response?.data?.chatsByUserID?.items.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) ?? null
}


// to be used at page load
export const useListChatsByUser = (userID: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CHATS, userID],
        queryFn: () => listChatsByUserID(userID),
        enabled: !!userID,
        refetchOnWindowFocus: true,
        refetchInterval: 10000,
        refetchIntervalInBackground: true,
        refetchOnMount: true,
        refetchOnReconnect: true,

    })
}


/**
 * Resolver Lambda
 * @param args 
 * @returns 
 */

export const appsyncResolver = (args: string) => client.graphql({
    query: resolverLambda,
    variables: {
        args,
    }
})