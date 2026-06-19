declare module "expo-document-picker" {
  export function getDocumentAsync(options: {
    copyToCacheDirectory: boolean;
    multiple: boolean;
    type: string[];
  }): Promise<
    | { canceled: true }
    | {
        canceled: false;
        assets: {
          uri: string;
          name: string;
          mimeType?: string;
          size?: number;
        }[];
      }
  >;
}
