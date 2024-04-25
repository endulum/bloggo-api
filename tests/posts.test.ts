import '../mongo/mongoConfigTesting'
import { createUser } from './testHelpers'
import User from '../models/user'

describe('post client ops', () => {
  let user: { username: string, token: string }

  beforeAll(async () => {
    await User.deleteMany({})
    user = await createUser('test')
  })

  test('doesn\'t explode', () => {
    console.log(user)
    expect(2).toBe(2)
  })
})
