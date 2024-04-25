import '../mongo/mongoConfigTesting'
import { ValidationLoopWrapper, createUser, reqShort, assertDefined } from './testHelpers'
import User, { type IUserDocument } from '../models/user'
import Post, { type IPostDocument } from '../models/post'

describe('post client ops', () => {
  const users: Array<{ user: IUserDocument, token: string }> = []
  let targetPostId: string

  beforeAll(async () => {
    await User.deleteMany({})
    await Post.deleteMany({})
    await Promise.all(['test-0', 'test-1'].map(async username => {
      const user = await createUser(username)
      users.push(user)
    }))
  })

  const contentErrors = [
    { value: '', msg: 'You cannot create an empty post.' },
    {
      value: Array(25001).fill('A').join(''),
      msg: 'Posts cannot be more than 25000 characters long.'
    }
  ]

  const tagErrors = [
    // { value: 'tag,tag', msg: 'No duplicate tags allowed.' },
    {
      value: Array(100).fill('A').join(''),
      msg: 'Tags cannot be longer than 32 characters.'
    },
    {
      value: Array(6).fill('').map((_curr, index) => index).join(','),
      msg: 'Posts cannot have more than 5 tags. Choose your tags wisely.'
    }
  ]

  describe('creating new posts', () => {
    const correctDetails = {
      content: 'Hello, this is a short post.',
      tags: 'hello,test'
    }

    let newPostLoop: ValidationLoopWrapper
    beforeAll(() => {
      newPostLoop = new ValidationLoopWrapper(
        correctDetails, '/posts', 'post', users[0].token
      )
    })

    test('POST /posts - 422 if input error (content)', async () => {
      await newPostLoop.call('content', contentErrors)
    })

    test('POST /posts - 422 if input error (tags)', async () => {
      await newPostLoop.call('tags', tagErrors)
    })

    test('POST /posts - 200 and creates a Post object', async () => {
      const response = await reqShort('/posts', 'post', users[0].token, correctDetails)
      expect(response.status).toBe(200)
      const existingPost = assertDefined<IPostDocument>(await Post.findOne({}))
      expect(existingPost.content).toEqual(correctDetails.content)
      expect(existingPost.tags.join(',')).toEqual(correctDetails.tags)
      targetPostId = existingPost.id
    })
  })

  describe('editing existing post', () => {
    const correctDetails = {
      content: 'Oh look, my content was edited.',
      tags: 'goodbye,test'
    }

    let editPostLoop: ValidationLoopWrapper
    beforeAll(() => {
      editPostLoop = new ValidationLoopWrapper(
        correctDetails, `/post/${targetPostId}`, 'put', users[0].token
      )
    })

    test('PUT /post/:post - 404 if post not found', async () => {
      const response = await reqShort(
        '/post/owowowo', 'put', users[0].token, correctDetails
      )
      expect(response.status).toBe(404)
    })

    test('PUT /post/:post - 403 if post does not belong to you', async () => {
      const otherPost = await Post.create({
        content: 'This is a post by someone else. It should not be editable.',
        author: users[1].user
      })
      const response = await reqShort(
        `/post/${otherPost.id}`, 'put', users[0].token, correctDetails
      )
      expect(response.status).toBe(403)
      await otherPost.deleteOne()
    })

    test('PUT /post/:post - 422 if input error (content)', async () => {
      await editPostLoop.call('content', contentErrors)
    })

    test('PUT /post/:post - 422 if input error (tags)', async () => {
      await editPostLoop.call('tags', tagErrors)
    })

    test('PUT /post/:post - 200 and changes details of a Post', async () => {
      const response = await reqShort(
        `/post/${targetPostId}`, 'put', users[0].token, correctDetails
      )
      expect(response.status).toBe(200)
      const existingPost = assertDefined<IPostDocument>(await Post.findById(targetPostId))
      expect(existingPost.content).toEqual(correctDetails.content)
      expect(existingPost.tags.join(',')).toEqual(correctDetails.tags)
      expect(existingPost.timestamp.edited).not.toBeNull()
    })
  })

  describe('deleting existing post', () => {
    test('DELETE /post/:post - 404 if post not found', async () => {
      const response = await reqShort('/post/notAPostId', 'delete', users[0].token)
      expect(response.status).toBe(404)
    })

    test('DELETE /post/:post - 403 if post does not belong to you', async () => {
      const response = await reqShort(`/post/${targetPostId}`, 'delete', users[1].token)
      expect(response.status).toBe(403)
    })

    test('DELETE /post/:post - 200 and deletes the Post permanently', async () => {
      const response = await reqShort(`/post/${targetPostId}`, 'delete', users[0].token)
      expect(response.status).toBe(200)
      const existingPost = await Post.findById(targetPostId)
      expect(existingPost).toBeNull()
    })
  })

  describe('viewing all posts a user made', () => {
    beforeAll(async () => {
      await Post.create({
        content: 'This is a post.',
        author: users[0].user,
        tags: ['post', 'test']
      })
    })

    test('GET /user/:user/posts - 404 if user not found', async () => {
      const response = await reqShort('/user/nonexistentUser/posts', 'get', null)
      expect(response.status).toBe(404)
    })

    test('GET /user/:user/posts - 200 and array of posts (empty)', async () => {
      const response = await reqShort(`/user/${users[1].user.username}/posts`, 'get', null)
      expect(response.status).toBe(200)
      expect(response.body.length).toBe(0)
    })

    test('GET /user/:user/posts - 200 and array of posts (not empty)', async () => {
      const response = await reqShort(`/user/${users[0].user.username}/posts`, 'get', null)
      expect(response.status).toBe(200)
      expect(response.body.length).toBe(1)
      console.log(response.body)
    })
  })
})
