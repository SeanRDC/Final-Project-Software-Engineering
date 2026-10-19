import { expect, test } from 'vitest'

import {
  issueErrors,
  linesFromContents,
  returnErrors,
  toIssue,
  toReturn,
  type KitLine,
} from '@/pages/medkit/kitLines'
import { contents } from '@/test/medkitFixture'

test('a kit starts from its standard contents, every line ticked', () => {
  expect(linesFromContents(contents)).toEqual([
    {
      medicine_id: 11,
      name: 'Loperamide 2 mg',
      unit: 'capsule',
      on_hand: 40,
      quantity: '10',
      included: true,
    },
    {
      medicine_id: 12,
      name: 'Paracetamol 500 mg',
      unit: 'tablet',
      on_hand: 240,
      quantity: '20',
      included: true,
    },
  ])
})

const lines = (): KitLine[] => linesFromContents(contents)

test('flags a quantity that is not a whole number or more than is on hand', () => {
  const [first, second] = lines()
  expect(issueErrors([{ ...first!, quantity: '0' }, second!])).toEqual({
    lines: { 11: 'Enter 1 or more.' },
  })
  expect(issueErrors([first!, { ...second!, quantity: '241' }])).toEqual({
    lines: { 12: 'Only 240 tablet on hand.' },
  })
  expect(issueErrors(lines())).toEqual({ lines: {} })
})

test('lines left unticked are not checked or sent', () => {
  const [first, second] = lines()
  const picked = [first!, { ...second!, included: false, quantity: '' }]
  expect(issueErrors(picked)).toEqual({ lines: {} })
  expect(toIssue(3, picked)).toEqual({ medkit_id: 3, items: [{ medicine_id: 11, quantity: 10 }] })
})

test('a kit needs at least one item', () => {
  const none = lines().map((line) => ({ ...line, included: false }))
  expect(issueErrors(none).form).toBe('Tick at least one item to put in the kit.')
})

const issued = [
  { id: 1, quantity_issued: 10, unit: 'capsule' },
  { id: 2, quantity_issued: 20, unit: 'tablet' },
]

test('every item is counted back, from 0 to what went out', () => {
  expect(returnErrors(issued, { 1: '6', 2: '' })).toEqual({ 2: 'Enter how many came back.' })
  expect(returnErrors(issued, { 1: '11', 2: '20' })).toEqual({
    1: 'Only 10 capsule went out.',
  })
  expect(returnErrors(issued, { 1: '0', 2: '20' })).toEqual({})
})

test('sends each count with its item', () => {
  expect(toReturn(issued, { 1: '6', 2: '20' }, ' Kit complete ')).toEqual({
    items: [
      { item_id: 1, quantity_returned: 6 },
      { item_id: 2, quantity_returned: 20 },
    ],
    notes: 'Kit complete',
  })
})
