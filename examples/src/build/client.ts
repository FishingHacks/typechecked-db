import DBClient, { ModelApi, middlewareFunction } from '../../../src/client/';
import { Post as m_Post,User as m_User } from './types';
import { Post as o_Post,User as o_User } from './modelObjects';
export default class Client {
  private disabledMiddleware: boolean;
  private provider = {"provider":"enmap"};
  private client: DBClient<m_Post|m_User>;
  readonly post: ModelApi<m_Post>
  readonly user: ModelApi<m_User>

  constructor(config?: { disableMiddleware?: boolean }) {
    config ||= {}
    this.disabledMiddleware = !!config.disableMiddleware;
    const client = new DBClient<m_Post|m_User>({"provider":"enmap"});
    this.client = client;
    this.post = {create(model) {return client.$create<m_Post>(o_Post, model, "Post");},find(query) {return client.$findMany<m_Post>(o_Post, query, "Post");},findOne(query) {return client.$findOne<m_Post>(o_Post, query, "Post");},findOneAndDelete(query) {return client.$delete<m_Post>(o_Post, query, "Post");},findOneAndUpdate(query, model) {return client.$update<m_Post>(o_Post, query, model, "Post");},clear() {return client.$clear<m_Post>("Post")}}
    this.user = {create(model) {return client.$create<m_User>(o_User, model, "User");},find(query) {return client.$findMany<m_User>(o_User, query, "User");},findOne(query) {return client.$findOne<m_User>(o_User, query, "User");},findOneAndDelete(query) {return client.$delete<m_User>(o_User, query, "User");},findOneAndUpdate(query, model) {return client.$update<m_User>(o_User, query, model, "User");},clear() {return client.$clear<m_User>("User")}}
    }

  $use(fn:middlewareFunction<m_Post|m_User>){
    if (this.disabledMiddleware) throw new Error("Middleware isn't enabled");
    return this.client.$use(fn);
  }
  $connect() {return this.client.$connect()};
  $disconnect() {return this.client.$disconnect()};
  get isConnected() {return this.client.isConnected};
}