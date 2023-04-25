import { BaseTable } from '../baseTable';

export class UserSessionTable extends BaseTable {
  readonly table = 'userSession';
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    sessionToken: t.text().unique(),
    publicAddress: t.text(),


    expiresAt: t.timestampWithoutTimeZone(), //in UTC 

    
    ...t.timestamps(),
  }));
}
