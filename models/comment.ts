import mongoose, { type Types, Schema } from 'mongoose'

export interface IComment {
  text: string
  author: Types.ObjectId
  post: Types.ObjectId
}

const CommentSchema = new Schema<IComment>({
  text: { type: String, required: true, minlength: 1 },
  author: { type: Schema.ObjectId, required: true },
  post: { type: Schema.ObjectId, required: true }
})

const Comment = mongoose.model<IComment>('Comment', CommentSchema)
export default Comment
