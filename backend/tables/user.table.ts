import { BaseTable } from '../baseTable';

export class UserTable extends BaseTable {
  readonly table = 'user';
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    publicAddress: t.text().unique(),
  }));
}
