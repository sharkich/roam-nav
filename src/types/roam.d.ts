export {};

declare global {
  interface RoamPage {
    title: string;
    uid: string;
  }

  interface ExtensionAPI {
    settings: {
      get(key: string): unknown;
      set(key: string, value: unknown): Promise<void>;
      getAll(): Record<string, unknown>;
    };
    ui: {
      commandPalette: {
        addCommand(args: { label: string; callback: () => void }): void;
        removeCommand(args: { label: string }): void;
      };
    };
  }

  interface Window {
    roamAlphaAPI: {
      data: {
        q(query: string, ...args: unknown[]): unknown[][];
        fast: {
          q(query: string, ...args: unknown[]): unknown[][];
        };
      };
      ui: {
        mainWindow: {
          openPage(args: { title: string }): void;
          openBlock(args: { block: { uid: string } }): void;
        };
      };
    };
  }
}
