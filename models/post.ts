import mongoose, { type Types, type Document, Schema, type Model } from 'mongoose'

import { type IUserDocument } from './user'
import Tag from './tag'
import Comment from './comment'

export interface IPost {
  content: string // the full string for the post's markdown
  author: IUserDocument | Types.ObjectId // ref to one user + can be populated
  timestamp: {
    created: Date // date the post was made
    edited: Date // date the post was last edited
  }
  tags: string[] // array of refs to some tags + can be populated
  savedBy: Types.ObjectId[] // array of refs to many users
  comments: Types.ObjectId[] // array of refs to many comments
}

export interface IPostDocument extends IPost, Document {
  editPost: (content: string, tags: string[]) => Promise<void>
  // edit the post content and tags
  savePost: (user: IUserDocument) => Promise<void>
  // a user can "save" posts
  commentOnPost: (user: IUserDocument, text: string) => Promise<void>
  // a user can comment on posts
}

export interface IPostModel extends Model<IPostDocument> {
  createPost: (user: IUserDocument, content: string, tags: string[]) => Promise<void>
  // make a post using content and tags
}

const PostSchema = new Schema<IPostDocument>({
  content: { type: String, required: true, maxlength: 2500 },
  author: { type: Schema.ObjectId, required: true, immutable: true },
  timestamp: {
    created: { type: Date, required: true, default: () => Date.now(), immutable: true },
    edited: { type: Date, required: true, default: null }
  },
  tags: { type: [String], required: true, default: [] },
  savedBy: { type: [Schema.ObjectId], required: true, default: [] },
  comments: { type: [Schema.ObjectId], required: true, default: [] }
})

PostSchema.statics.createPost = async function (
  user: IUserDocument, content: string, tags: string[]
) {
  await Post.create({ author: user, content, tags })
  await Tag.manageNewPostTags(tags)
}

PostSchema.methods.editPost = async function (content: string, tags: string[]) {
  const oldTags = this.tags as string[]
  this.content = content
  this.tags = tags
  this.timestamp.edited = Date.now()
  await this.save()
  await Tag.manageEditedTags(oldTags, tags)
}

PostSchema.methods.savePost = async function (user: IUserDocument) {
  this.savedBy.push(user)
  await this.save()
}

PostSchema.methods.commentOnPost = async function (user: IUserDocument, text: string) {
  const comment = await Comment.create({ text, author: user, post: this })
  this.comments.push(comment)
}

const Post = mongoose.model<IPostDocument, IPostModel>('Post', PostSchema)
export default Post
