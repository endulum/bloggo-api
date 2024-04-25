import { type IPostDocument } from './models/post'
import { type IUserDocument } from './models/user'

declare global {
  namespace Express {
    interface Request {
      authUser: IUserDocument // the authenticated user
      reqUser: IUserDocument // the user indicated by :user TODO FIX THIS
      thisUser: IUserDocument // for validation chains involving a target user
      post: IPostDocument // the post indicated by :post
    }
  }
}
