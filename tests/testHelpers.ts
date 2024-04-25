import request, { type Response } from 'supertest'
import jsonwebtoken from 'jsonwebtoken'
import 'dotenv/config'

import app from './appTesting'
import User from '../models/user'

// reassign an object using this function to avoid "possibly null/undefined" errors
export const assertDefined = <T>(obj: T | null | undefined): T => {
  expect(obj).toBeDefined()
  return obj as T
}

// shorthand for creating requests
export const reqShort = async (
  url: string,
  method?: string | null,
  token?: string | null,
  form?: Record<string, string> | null
): Promise<Response> => {
  switch (method) {
    case 'post': return await request(app)
      .post(url)
      .set({ Authorization: token !== null ? `Bearer ${token}` : '' })
      .type('form').send(form ?? {})
    case 'put': return await request(app)
      .put(url)
      .set({ Authorization: token !== null ? `Bearer ${token}` : '' })
      .type('form').send(form ?? {})
    case 'delete': return await request(app)
      .delete(url)
      .set({ Authorization: token !== null ? `Bearer ${token}` : '' })
    default: return await request(app)
      .get(url)
      .set({ Authorization: token !== null ? `Bearer ${token}` : '' })
  }
}

// creates a user + token pair
export const createUser = async (
  username: string
): Promise<{ username: string, token: string }> => {
  // first, make the User object
  const user = await User.create({ username, password: 'password' })
  // then sign the token for the object
  const secret = process.env.SECRET
  if (secret === undefined) throw new Error('JWT secret is not defined.')
  const token = jsonwebtoken.sign(
    { username, id: user.id }, secret
  )
  // finally, return everything
  return { username, token }
}

// loop through a given array of possible validation errors
// this tests for only one validation error at a time
export const validationLoop = async (
  fieldName: string,
  errorArray: Array<{ value: string, msg: string }>,
  correctDetails: Record<string, string>,
  reqUrl: string,
  reqMethod: string,
  reqToken: string | null
): Promise<void> => {
  await Promise.all(errorArray.map(async error => {
    const response = await reqShort(reqUrl, reqMethod, reqToken, {
      ...correctDetails, [fieldName]: error.value
    })
    expect(response.status).toBe(422)
    expect(response.body.errors).toEqual([{ ...error, path: fieldName }])
  }))
}

// in describe blocks where the details, url, method, and token will always be the same,
// this wrapper does away with the four repetitive arguments, leaving only two
export class ValidationLoopWrapper {
  correctDetails: Record<string, string>
  reqUrl: string
  reqMethod: string
  reqToken: string | null

  constructor (
    correctDetails: Record<string, string>,
    reqUrl: string,
    reqMethod: string,
    reqToken: string | null
  ) {
    this.correctDetails = correctDetails
    this.reqUrl = reqUrl
    this.reqMethod = reqMethod
    this.reqToken = reqToken
  }

  async call (
    fieldName: string,
    errorArray: Array<{ value: string, msg: string }>
  ): Promise<void> {
    await validationLoop(
      fieldName, errorArray, this.correctDetails, this.reqUrl, this.reqMethod, this.reqToken
    )
  }
}
