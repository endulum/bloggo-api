import express from 'express'
import asyncHandler from 'express-async-handler'

import userController from '../controllers/userController'
import postController from '../controllers/postController'

const router = express.Router()

router.route('/user/:id')
  .get(userController.getUser)
  .put(
    userController.authenticate,
    userController.doesUserExist,
    userController.areYouThisUser,
    userController.editUser
  )

router.route('/signup')
  .post(userController.signUp)

router.route('/login')
  .get(userController.authenticate, asyncHandler(async (req, res, next) => {
    res.status(200).json({
      username: req.authUser.username,
      id: req.authUser.id
    })
  }))
  .post(userController.logIn)

router.route('/posts')
  .post(
    userController.authenticate,
    postController.createPost
  )

router.route('/post/:post')
  .put(
    userController.authenticate,
    postController.doesPostExist,
    postController.areYouPostAuthor,
    postController.editPost
  )
  .delete(
    userController.authenticate,
    postController.doesPostExist,
    postController.areYouPostAuthor,
    postController.deletePost
  )

router.route('/user/:id/posts')
  .get(
    userController.doesUserExist,
    postController.getPostsByUser
  )

export default router
