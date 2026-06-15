interface FBInitParams {
  appId: string;
  cookie?: boolean;
  xfbml?: boolean;
  version: string;
}

interface FBUIParams {
  method: "share";
  href: string;
  display?: string;
  [key: string]: any;
}

interface FBType {
  init(params: FBInitParams): void;
  ui(params: FBUIParams, callback: (response: any) => void): void;
}

interface Window {
  FB: FBType;
  fbAsyncInit?: () => void;
}
