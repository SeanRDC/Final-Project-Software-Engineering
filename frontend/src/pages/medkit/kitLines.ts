// The rules behind issuing a kit and counting it back, kept apart from the dialogs.

import type { KitContentsLine, MedkitIssue, MedkitReturn } from '@/api/types'

/** One medicine the nurse may put in the kit, with the quantity as typed. */
export type KitLine = {
  medicine_id: number
  name: string
  unit: string
  on_hand: number
  quantity: string
  included: boolean
}

export function linesFromContents(contents: KitContentsLine[]): KitLine[] {
  return contents.map((line) => ({
    medicine_id: line.medicine_id,
    name: line.medicine_name,
    unit: line.unit,
    on_hand: line.quantity_on_hand,
    quantity: String(line.default_quantity),
    included: true,
  }))
}

function wholeNumber(text: string): number | null {
  const value = text.trim()
  return /^\d+$/.test(value) ? Number(value) : null
}

/** What is wrong with each ticked line, by medicine, and with the kit as a whole. */
export function issueErrors(lines: KitLine[]): { lines: Record<number, string>; form?: string } {
  const errors: Record<number, string> = {}
  const picked = lines.filter((line) => line.included)
  for (const line of picked) {
    const quantity = wholeNumber(line.quantity)
    if (quantity === null || quantity < 1) errors[line.medicine_id] = 'Enter 1 or more.'
    else if (quantity > line.on_hand) {
      errors[line.medicine_id] = `Only ${line.on_hand} ${line.unit} on hand.`
    }
  }
  if (picked.length === 0)
    return { lines: errors, form: 'Tick at least one item to put in the kit.' }
  return { lines: errors }
}

export function toIssue(medkitId: number, lines: KitLine[]): MedkitIssue {
  return {
    medkit_id: medkitId,
    items: lines
      .filter((line) => line.included)
      .map((line) => ({ medicine_id: line.medicine_id, quantity: Number(line.quantity.trim()) })),
  }
}

type IssuedItem = { id: number; quantity_issued: number; unit: string }

/** What is wrong with each count, by item. Every item needs one, 0 for used up. */
export function returnErrors(
  items: IssuedItem[],
  counts: Record<number, string>,
): Record<number, string> {
  const errors: Record<number, string> = {}
  for (const item of items) {
    const count = wholeNumber(counts[item.id] ?? '')
    if (count === null) errors[item.id] = 'Enter how many came back.'
    else if (count > item.quantity_issued) {
      errors[item.id] = `Only ${item.quantity_issued} ${item.unit} went out.`
    }
  }
  return errors
}

export function toReturn(
  items: IssuedItem[],
  counts: Record<number, string>,
  notes: string,
): MedkitReturn {
  return {
    items: items.map((item) => ({
      item_id: item.id,
      quantity_returned: Number((counts[item.id] ?? '').trim()),
    })),
    notes: notes.trim() || null,
  }
}
