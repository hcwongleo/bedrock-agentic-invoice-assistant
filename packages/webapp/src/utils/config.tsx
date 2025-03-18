import {Box, Popover, Link} from "@cloudscape-design/components"

export interface BDAResult {
  matched_blueprint?: {
      confidence: number;
      name: string;
      arn: string;
  };
  document_class?: {
      type: string;
  };
  inference_result?: {
      // Bank statement fields
      statement_date?: string;
      saving_account_balance?: string | number;
      checking_account_balance?: string | number;
      checking_account_number?: string;
      saving_account_number?: string;
      account_name?: string;
      address?: string;
      statement_period?: string;

      // US Driving License fields
      NAME_DETAILS?: {
          SUFFIX: string;
          MIDDLE_NAME: string;
          LAST_NAME: string;
          FIRST_NAME: string;
      };
      STATE_NAME?: string;
      ID_NUMBER?: string;
      EXPIRATION_DATE?: string;
      ENDORSEMENTS?: string[];
      PERSONAL_DETAILS?: {
          SEX: string;
          HAIR_COLOR: string;
          HEIGHT: string;
          WEIGHT: string;
          EYE_COLOR: string;
      };
      RESTRICTIONS?: string[];
      ADDRESS_DETAILS?: {
          CITY: string;
          ZIP_CODE: string;
          STATE: string;
          STREET_ADDRESS: string;
      };
      CLASS?: string;
      DATE_OF_BIRTH?: string;
      COUNTY?: string;
      DATE_OF_ISSUE?: string;
  };
  image?: {
      summary?: string;
  };
}

export interface Message {
  type: 'chat-bubble' | 'alert';
  authorId: string;
  content: string | JSX.Element;
  timestamp: string;
  avatarLoading?: boolean;
  documents?: Array<{
    id: string;
    title: string;
    imageUrl: string;
  }>;
}

export interface ChatResponse {
  id: string;
  userID: string;
  human: string;
  bot?: string;
  timestamp: string;
  documents?: Array<{
      id: string;
      title: string;
      imageUrl: string;
  }>;
}

export type AuthorAvatarProps = {
  type: 'user' | 'gen-ai';
  name: string;
  initials?: string;
  loading?: boolean;
};

type AuthorsType = {
  [key: string]: AuthorAvatarProps;
};

export const AUTHORS: AuthorsType = {
  'user-jane-doe': { type: 'user', name: 'You', initials: 'U' },
  'gen-ai': { type: 'gen-ai', name: 'Generative AI assistant' },
};

export const getLoadingMessage = (): Message => ({
  type: 'chat-bubble',
  authorId: 'gen-ai', 
  content: <Box color="text-status-inactive">Generating a response</Box>,
  timestamp: new Date().toLocaleTimeString(),
  avatarLoading: true,
});

export type ResolverLambdaMutation = {
  __typename: "Mutation";
  resolverLambda?: string | null;
};

type ValidPromptType = {
  prompt: Array<string>;
  getResponse: () => Message;
};

const CitationPopover = ({ count, href }: { count: number; href: string }) => (
  <Box color="text-status-info" display="inline">
    <Popover
      header="Source"
      content={
        <Link href={href} external variant="primary">
          {href}
        </Link>
      }
      position="right"
    >
      [{count}]
    </Popover>
  </Box>
);

