import { type RequestHandler } from 'express'
import asyncHandler from 'express-async-handler'
import { type ValidationChain, body } from 'express-validator'
import sendErrorsIfAny from '../middleware/sendErrorsIfAny'
import Post from '../models/post'

const postController:
Record<string, RequestHandler | Array<RequestHandler | ValidationChain>> = {}

postController.doesPostExist = asyncHandler(async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.post).populate('author')
    if (post === null) throw new Error()
    req.post = post
    next()
  } catch {
    res.status(404).send('Post could not be found.')
  }
})

postController.areYouPostAuthor = asyncHandler(async (req, res, next) => {
  if (req.post.author._id.toString() !== req.authUser.id.toString()) {
    res.status(403).send('You are not the author of this post.')
  } else next()
})

const postValidation = [
  body('content')
    .trim()
    .isLength({ min: 1 }).withMessage('You cannot create an empty post.').bail()
    .isLength({ max: 25000 }).withMessage('Posts cannot be more than 25000 characters long.').bail()
    .escape(),

  body('tags')
    .trim()
    .custom(async (value: string) => {
      const tags = value.split(',')
      return tags.every(tag => tag.length <= 32)
        ? true
        : await Promise.reject(new Error())
    }).withMessage('Tags cannot be longer than 32 characters.').bail()
    .custom(async (value: string) => {
      const tags = [...new Set(value.split(','))]
      return tags.length <= 5
        ? true
        : await Promise.reject(new Error())
    }).withMessage('Posts cannot have more than 5 tags. Choose your tags wisely.').bail()
    .escape()
]

postController.createPost = [
  ...postValidation,
  sendErrorsIfAny,
  asyncHandler(async (req, res, next) => {
    await Post.createPost(
      req.authUser, req.body.content as string, (req.body.tags as string).split(',')
    )
    res.sendStatus(200)
  })
]

postController.editPost = [
  ...postValidation,
  sendErrorsIfAny,
  asyncHandler(async (req, res, next) => {
    await req.post.editPost(req.body.content as string, (req.body.tags as string).split(','))
    res.sendStatus(200)
  })
]

postController.deletePost = asyncHandler(async (req, res, next) => {
  await req.post.deleteOne()
  res.sendStatus(200)
})

postController.getPostsByUser = asyncHandler(async (req, res, next) => {
  const posts = await Post.find({ author: req.reqUser })
  res.status(200).json(posts) // TODO: limit the properties that are shown
})

export default postController
