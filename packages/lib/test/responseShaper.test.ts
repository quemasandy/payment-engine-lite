import { shapeResponse } from '../src/responseShaper'

test('rename and omit', () => {
  const shaped = shapeResponse({a:1,b:2,c:3}, { rename: {a:'aa'}, omit: ['c'] })
  expect(shaped).toEqual({ aa:1, b:2 })
})
