import { window } from "vscode";
import { App } from "../common/app";
import { extLogger } from "../common";
import { DisposableObject } from "../pure/disposable-object";
import { DbConfigStore } from "./config/db-config-store";
import { DbManager } from "./db-manager";
import { DbPanel } from "./ui/db-panel";
import { DbSelectionDecorationProvider } from "./ui/db-selection-decoration-provider";

export class DbModule extends DisposableObject {
  public readonly dbManager: DbManager;
  private readonly dbConfigStore: DbConfigStore;

  constructor(app: App) {
    super();

    this.dbConfigStore = new DbConfigStore(app);
    this.dbManager = new DbManager(app, this.dbConfigStore);
  }

  public async initialize(): Promise<void> {
    void extLogger.log("Initializing database module");

    await this.dbConfigStore.initialize();

    const dbPanel = new DbPanel(this.dbManager);
    await dbPanel.initialize();

    this.push(dbPanel);
    this.push(this.dbConfigStore);

    const dbSelectionDecorationProvider = new DbSelectionDecorationProvider();

    window.registerFileDecorationProvider(dbSelectionDecorationProvider);
  }
}

export async function initializeDbModule(app: App): Promise<DbModule> {
  const dbModule = new DbModule(app);
  await dbModule.initialize();
  return dbModule;
}
