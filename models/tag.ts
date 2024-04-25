import mongoose, { Schema, type Model } from 'mongoose'

export interface ITag {
  name: string
  totalPosts: number
}

export interface ITagModel extends Model<ITag> {
  manageNewPostTags: (tags: string[]) => Promise<void>
  manageEditedTags: (oldTags: string[], newTags: string[]) => Promise<void>
}

const TagSchema = new Schema<ITag>({
  name: { type: String, required: true, immutable: true, unique: true },
  totalPosts: { type: Number, required: true, default: 1 }
})

async function addToTag (name: string): Promise<void> {
  const tag = await Tag.findOne({ name })
  if (tag === null) {
    await Tag.create({ name })
  } else {
    tag.totalPosts += 1
    await tag.save()
  }
}

async function removeFromTag (name: string): Promise<void> {
  const tag = await Tag.findOne({ name })
  if (tag !== null) {
    tag.totalPosts -= 1
    await tag.save()
    if (tag.totalPosts === 0) {
      await Tag.findByIdAndDelete(tag.id)
    }
  }
}

TagSchema.statics.manageNewPostTags = async function (tags: string[]) {
  for (const name of tags) {
    await addToTag(name)
  }
}

TagSchema.statics.manageEditedTags = async function (oldTags: string[], newTags: string[]) {
  for (const newTag of newTags) {
    // if this new tag was not present in the old tags, increment the count of this tag
    if (oldTags.every(oldTag => oldTag !== newTag)) {
      await addToTag(newTag)
    }
  }

  for (const oldTag of oldTags) {
    // if this old tag is not present in the new tags, decrement the count of this tag
    if (newTags.every(newTag => newTag !== oldTag)) {
      await removeFromTag(oldTag)
    }
  }
}

const Tag = mongoose.model<ITag, ITagModel>('Tag', TagSchema)
export default Tag
