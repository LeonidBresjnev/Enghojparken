import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock Firebase module
let mockAuthState = {
  uid: 'test-user-123',
  displayName: 'Jacob Bestyrelse',
  email: 'jacob@enghojparken.dk',
}

let mockCardsData = []
let snapshotCallback = null

vi.mock('../firebase', () => {
  return {
    auth: { currentUser: null },
    db: {},
    signOut: vi.fn(() => {
      mockAuthState = null
      return Promise.resolve()
    }),
    onAuthStateChanged: vi.fn((authObj, callback) => {
      callback(mockAuthState)
      return () => {}
    }),
    collection: vi.fn((db, name) => ({ _type: 'collection', name })),
    doc: vi.fn((db, coll, id) => ({ _type: 'doc', coll, id })),
    query: vi.fn((coll, ...args) => ({ _type: 'query', coll, args })),
    orderBy: vi.fn((field, dir) => ({ field, dir })),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    addDoc: vi.fn((collRef, data) => {
      const newId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      const newCard = { id: newId, ...data }
      mockCardsData.push(newCard)
      if (snapshotCallback) {
        snapshotCallback({
          docs: mockCardsData.map((c) => ({
            id: c.id,
            data: () => c,
          })),
        })
      }
      return Promise.resolve({ id: newId })
    }),
    updateDoc: vi.fn((docRef, updates) => {
      const index = mockCardsData.findIndex((c) => c.id === docRef.id)
      if (index !== -1) {
        mockCardsData[index] = { ...mockCardsData[index], ...updates }
      }
      if (snapshotCallback) {
        snapshotCallback({
          docs: mockCardsData.map((c) => ({
            id: c.id,
            data: () => c,
          })),
        })
      }
      return Promise.resolve()
    }),
    deleteDoc: vi.fn((docRef) => {
      mockCardsData = mockCardsData.filter((c) => c.id !== docRef.id)
      if (snapshotCallback) {
        snapshotCallback({
          docs: mockCardsData.map((c) => ({
            id: c.id,
            data: () => c,
          })),
        })
      }
      return Promise.resolve()
    }),
    onSnapshot: vi.fn((queryRef, onNext) => {
      snapshotCallback = onNext
      onNext({
        docs: mockCardsData.map((c) => ({
          id: c.id,
          data: () => c,
        })),
      })
      return () => {
        snapshotCallback = null
      }
    }),
  }
})

describe('Scrumboard Tests with Mock Data', () => {
  beforeEach(() => {
    mockAuthState = {
      uid: 'test-user-123',
      displayName: 'Jacob Bestyrelse',
      email: 'jacob@enghojparken.dk',
    }

    mockCardsData = [
      {
        id: 'card-1',
        title: 'Forbered generalforsamling',
        description: 'Udsend dagsorden og indkaldelse 14 dage før.',
        columnId: 'todo',
        assignees: ['Jacob Bestyrelse (Kasserer)', 'Formand'],
        assignee: 'Jacob Bestyrelse (Kasserer), Formand',
        priority: 'High',
        dueDate: '2026-05-01',
        category: 'Generalforsamling',
      },
      {
        id: 'card-2',
        title: 'Gennemgå årsregnskab',
        description: 'Tjek bilag og stem overens med bankkonto.',
        columnId: 'in_progress',
        assignees: ['Jacob Bestyrelse (Kasserer)'],
        assignee: 'Jacob Bestyrelse (Kasserer)',
        priority: 'High',
        dueDate: '2026-04-15',
        category: 'Økonomi',
      },
      {
        id: 'card-3',
        title: 'Bestil havemand til forårsrengøring',
        description: 'Hækklipning og rensning af tagrender.',
        columnId: 'done',
        assignees: ['Næstformand'],
        assignee: 'Næstformand',
        priority: 'Low',
        dueDate: '2026-03-30',
        category: 'Vedligehold',
      },
    ]
  })

  it('renders initial board cards correctly across columns', () => {
    render(<App />)

    expect(screen.getByText('Bestyrelsens Scrumboard')).toBeInTheDocument()
    expect(screen.getByText('Forbered generalforsamling')).toBeInTheDocument()
    expect(screen.getByText('Gennemgå årsregnskab')).toBeInTheDocument()
    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('allows adding a new card with modal form', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click "Opret ny opgave"
    const createBtn = screen.getByRole('button', { name: /opret ny opgave/i })
    await user.click(createBtn)

    // Modal opens
    expect(screen.getByRole('heading', { name: /opret ny opgave/i })).toBeInTheDocument()

    // Fill in title and description
    const titleInput = screen.getByPlaceholderText(/f\.eks\. Klargør regnskab til generalforsamling/i)
    const descInput = screen.getByPlaceholderText(/Detaljer om opgaven og hvad der skal gøres\.\.\./i)

    await user.type(titleInput, 'Ny legepladsinspektion')
    await user.type(descInput, 'Årligt sikkerhedstjek af gynger og klatrestativ.')

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /tilføj opgave/i })
    await user.click(submitBtn)

    // Modal should close and new card should appear
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /opret ny opgave/i })).not.toBeInTheDocument()
    })

    expect(screen.getByText('Ny legepladsinspektion')).toBeInTheDocument()
    expect(screen.getByText('Årligt sikkerhedstjek af gynger og klatrestativ.')).toBeInTheDocument()
  })

  it('allows deleting an existing card', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()

    // Find delete buttons
    const deleteButtons = screen.getAllByTitle('Slet opgave')
    expect(deleteButtons.length).toBe(3)

    // Delete the 3rd card
    await user.click(deleteButtons[2])

    await waitFor(() => {
      expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    })
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('allows editing an existing card and saving changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click on the first card to open edit modal
    const cardTitle = screen.getByText('Forbered generalforsamling')
    await user.click(cardTitle)

    // Edit modal should be open
    expect(screen.getByRole('heading', { name: /rediger opgave/i })).toBeInTheDocument()

    const titleInput = screen.getByDisplayValue('Forbered generalforsamling')
    await user.clear(titleInput)
    await user.type(titleInput, 'Opdateret generalforsamling 2026')

    const saveBtn = screen.getByRole('button', { name: /gem ændringer/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /rediger opgave/i })).not.toBeInTheDocument()
    })

    expect(screen.getByText('Opdateret generalforsamling 2026')).toBeInTheDocument()
  })

  it('moves card across columns using direction arrow buttons', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Card 1 is in "todo", can move right to "in_progress"
    const nextButtons = screen.getAllByTitle('Flyt til næste kolonne')
    expect(nextButtons.length).toBeGreaterThan(0)

    await user.click(nextButtons[0])

    // Verify card is now moved
    await waitFor(() => {
      expect(mockCardsData.find((c) => c.id === 'card-1').columnId).toBe('in_progress')
    })
  })

  it('filters cards by category', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click on category "Økonomi"
    const ekonomiCategoryBtn = screen.getByRole('button', { name: 'Økonomi' })
    await user.click(ekonomiCategoryBtn)

    expect(screen.getByText('Gennemgå årsregnskab')).toBeInTheDocument()
    expect(screen.queryByText('Forbered generalforsamling')).not.toBeInTheDocument()
    expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)

    // Click "All" to restore
    const allCategoryBtn = screen.getByRole('button', { name: 'All' })
    await user.click(allCategoryBtn)

    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })

  it('supports selecting and deselecting assignees in AssigneeDropdown', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open create modal
    const createBtn = screen.getByRole('button', { name: /opret ny opgave/i })
    await user.click(createBtn)

    // Find the Assignee dropdown trigger button by finding the label and next element
    const label = screen.getByText('Ansvarlige (Bestyrelsesmedlemmer)')
    const dropdownContainer = label.parentElement
    const dropdownButton = dropdownContainer.querySelector('button')

    expect(dropdownButton).toBeInTheDocument()
    await user.click(dropdownButton)

    // Board member list appears
    expect(screen.getByText('Bestyrelsesmedlemmer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Næstformand/i })).toBeInTheDocument()

    // Select Næstformand
    await user.click(screen.getByRole('button', { name: /Næstformand/i }))

    // Fravælg alle button works
    const deselectAllBtn = screen.getByRole('button', { name: /fravælg alle/i })
    await user.click(deselectAllBtn)

    expect(screen.getByText('Vælg ansvarlige...')).toBeInTheDocument()
  })

  it('shows login lock screen and does not display board cards when unauthenticated', () => {
    mockAuthState = null
    render(<App />)

    expect(screen.getByText('Log ind for at se bestyrelsens overblik')).toBeInTheDocument()
    expect(screen.queryByText('Forbered generalforsamling')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /opret ny opgave/i })).not.toBeInTheDocument()
  })
})
