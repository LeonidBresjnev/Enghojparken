import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock Firebase module
let mockAuthState = {
  uid: 'test-user-123',
  displayName: 'Jacob Simonsen',
  email: 'leonid.bresjnev@gmail.com',
}

let mockCardsData = []
let snapshotCallbacks = []

function emitSnapshot() {
  const snapshot = {
    docs: mockCardsData.map((c) => ({
      id: c.id,
      data: () => c,
    })),
  }

  snapshotCallbacks.forEach((callback) => callback(snapshot))
}

vi.mock('../firebase', () => {
  return {
    auth: { currentUser: null },
    db: {},
    signOut: vi.fn(() => {
      mockAuthState = null
      return Promise.resolve()
    }),
    signInWithEmailAndPassword: vi.fn((_authObj, email) => {
      return Promise.resolve({ user: { email } })
    }),
    createUserWithEmailAndPassword: vi.fn((_authObj, email) => {
      return Promise.resolve({ user: { email } })
    }),
    signInWithPopup: vi.fn(() => {
      return Promise.resolve({ user: { email: 'leonid.bresjnev@gmail.com', displayName: 'Jacob Simonsen' } })
    }),
    updateProfile: vi.fn(() => Promise.resolve()),
    googleProvider: {},
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
      emitSnapshot()
      return Promise.resolve({ id: newId })
    }),
    updateDoc: vi.fn((docRef, updates) => {
      const index = mockCardsData.findIndex((c) => c.id === docRef.id)
      if (index !== -1) {
        mockCardsData[index] = { ...mockCardsData[index], ...updates }
      }
      emitSnapshot()
      return Promise.resolve()
    }),
    deleteDoc: vi.fn((docRef) => {
      mockCardsData = mockCardsData.filter((c) => c.id !== docRef.id)
      emitSnapshot()
      return Promise.resolve()
    }),
    onSnapshot: vi.fn((queryRef, onNext) => {
      snapshotCallbacks.push(onNext)
      emitSnapshot()

      return () => {
        snapshotCallbacks = snapshotCallbacks.filter((callback) => callback !== onNext)
      }
    }),
  }
})

describe('Scrumboard Tests with Mock Data', () => {
  beforeEach(() => {
    mockAuthState = {
      uid: 'test-user-123',
      displayName: 'Jacob Simonsen',
      email: 'leonid.bresjnev@gmail.com',
    }

    mockCardsData = [
      {
        id: 'card-1',
        title: 'Forbered generalforsamling',
        description: 'Udsend dagsorden og indkaldelse 14 dage før.',
        columnId: 'todo',
        assignees: ['Jacob Simonsen', 'Christoffer Burgess'],
        assignee: 'Jacob Simonsen, Christoffer Burgess',
        priority: 'High',
        dueDate: '2026-05-01',
      },
      {
        id: 'card-2',
        title: 'Gennemgå årsregnskab',
        description: 'Tjek bilag og stem overens med bankkonto.',
        columnId: 'in_progress',
        assignees: ['Jacob Simonsen'],
        assignee: 'Jacob Simonsen',
        priority: 'High',
        dueDate: '2026-04-15',
      },
      {
        id: 'card-3',
        title: 'Bestil havemand til forårsrengøring',
        description: 'Hækklipning og rensning af tagrender.',
        columnId: 'done',
        assignees: ['Erik Bjerg'],
        assignee: 'Erik Bjerg',
        priority: 'Low',
        dueDate: '2026-03-30',
      },
    ]

    snapshotCallbacks = []
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

  it('opens confirmation dialog when clicking delete card icon and allows deleting upon confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()

    // Find delete buttons on cards
    const deleteButtons = screen.getAllByTitle('Slet opgave')
    expect(deleteButtons.length).toBe(3)

    // Click delete on the 3rd card - should open confirmation dialog
    await user.click(deleteButtons[2])

    // Verify confirmation dialog is displayed with title and warning
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/Er du sikker på, at du vil slette opgaven/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/"Bestil havemand til forårsrengøring"/i)).toBeInTheDocument()

    // Test cancellation first: click "Annuller"
    const cancelBtn = within(dialog).getByRole('button', { name: /annuller/i })
    await user.click(cancelBtn)

    // Dialog closes and card is still present
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()

    // Click delete again and confirm deletion
    await user.click(deleteButtons[2])
    const confirmDialog = screen.getByRole('dialog')
    const confirmDeleteBtn = within(confirmDialog).getByRole('button', { name: /slet opgave/i })
    await user.click(confirmDeleteBtn)

    await waitFor(() => {
      expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    })
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('opens card when clicking directly on the card and does not show edit icon in bottom of card or icon after priority', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Verify edit icon is NOT in bottom of the card
    expect(screen.queryByTitle('Rediger opgave')).not.toBeInTheDocument()

    // Click anywhere on the card to open it
    const cardTitle = screen.getByText('Forbered generalforsamling')
    await user.click(cardTitle)

    // Edit modal should open
    expect(screen.getByRole('heading', { name: /rediger opgave/i })).toBeInTheDocument()
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

  it('filters cards by specific person / assignee', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Filter by Jacob Simonsen
    const jacobFilterBtn = screen.getByRole('button', { name: 'Jacob Simonsen' })
    await user.click(jacobFilterBtn)

    expect(screen.getByText('Forbered generalforsamling')).toBeInTheDocument()
    expect(screen.getByText('Gennemgå årsregnskab')).toBeInTheDocument()
    expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 2 opgaver')

    // Filter by Erik Bjerg
    const erikFilterBtn = screen.getByRole('button', { name: 'Erik Bjerg' })
    await user.click(erikFilterBtn)

    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    expect(screen.queryByText('Forbered generalforsamling')).not.toBeInTheDocument()
    expect(screen.queryByText('Gennemgå årsregnskab')).not.toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 1 opgaver')

    // Filter by Christoffer Burgess
    const christofferFilterBtn = screen.getByRole('button', { name: 'Christoffer Burgess' })
    await user.click(christofferFilterBtn)

    expect(screen.getByText('Forbered generalforsamling')).toBeInTheDocument()
    expect(screen.queryByText('Gennemgå årsregnskab')).not.toBeInTheDocument()
    expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 1 opgaver')

    // Filter by Niki Gonzalez (no tasks assigned yet)
    const nikiFilterBtn = screen.getByRole('button', { name: 'Niki Gonzalez' })
    await user.click(nikiFilterBtn)

    expect(screen.queryByText('Forbered generalforsamling')).not.toBeInTheDocument()
    expect(screen.queryByText('Gennemgå årsregnskab')).not.toBeInTheDocument()
    expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 0 opgaver')

    // Restore "Alle personer"
    const allFilterBtn = screen.getByRole('button', { name: 'Alle personer' })
    await user.click(allFilterBtn)

    expect(screen.getByText('Forbered generalforsamling')).toBeInTheDocument()
    expect(screen.getByText('Gennemgå årsregnskab')).toBeInTheDocument()
    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 3 opgaver')
  })

  it('does not have tags or categories on cards or modals', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Verify no tag / category text or elements in filter or on cards
    expect(screen.queryByText('Kategori:')).not.toBeInTheDocument()
    expect(screen.queryByText('General')).not.toBeInTheDocument()
    expect(screen.queryByText('Generalforsamling')).not.toBeInTheDocument()

    // Open create modal and verify no category input
    const createBtn = screen.getByRole('button', { name: /opret ny opgave/i })
    await user.click(createBtn)

    expect(screen.queryByText('Kategori')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/f\.eks\. Økonomi/i)).not.toBeInTheDocument()
  })

  it('supports selecting and deselecting assignees using names from users.json', async () => {
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

    // Board member list appears with names from users.json inside dropdown
    expect(within(dropdownContainer).getByText('Bestyrelsesmedlemmer')).toBeInTheDocument()
    expect(within(dropdownContainer).getByRole('button', { name: /Erik Bjerg/i })).toBeInTheDocument()
    expect(within(dropdownContainer).getByRole('button', { name: /Christoffer Burgess/i })).toBeInTheDocument()
    expect(within(dropdownContainer).getByRole('button', { name: /Niki Gonzalez/i })).toBeInTheDocument()
    expect(within(dropdownContainer).getByRole('button', { name: /Jacob Simonsen/i })).toBeInTheDocument()

    // Select Christoffer Burgess
    await user.click(within(dropdownContainer).getByRole('button', { name: /Christoffer Burgess/i }))

    // Fravælg alle button works
    const deselectAllBtn = within(dropdownContainer).getByRole('button', { name: /fravælg alle/i })
    await user.click(deselectAllBtn)

    expect(within(dropdownContainer).getByText('Vælg ansvarlige...')).toBeInTheDocument()
  })

  it('shows login lock screen and does not display board cards when unauthenticated', () => {
    mockAuthState = null
    render(<App />)

    expect(screen.getByText('Log ind for at se bestyrelsens overblik')).toBeInTheDocument()
    expect(screen.queryByText('Forbered generalforsamling')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /opret ny opgave/i })).not.toBeInTheDocument()
  })

  it('displays card title first with priority label to the right in the same line', async () => {
    render(<App />)

    const titleElement = screen.getByText('Forbered generalforsamling')
    const headerContainer = titleElement.closest('div')

    expect(headerContainer).toBeInTheDocument()
    // The same line container contains the title and the priority badge (in Danish default)
    expect(within(headerContainer).getByText('Høj')).toBeInTheDocument()
  })

  it('filters cards by priority and supports combined filtering', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Filter by Høj priority
    const highFilterBtn = screen.getByRole('button', { name: 'Høj' })
    await user.click(highFilterBtn)

    expect(screen.getByText('Forbered generalforsamling')).toBeInTheDocument()
    expect(screen.getByText('Gennemgå årsregnskab')).toBeInTheDocument()
    expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 2 opgaver')

    // Filter by Lav priority
    const lowFilterBtn = screen.getByRole('button', { name: 'Lav' })
    await user.click(lowFilterBtn)

    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    expect(screen.queryByText('Forbered generalforsamling')).not.toBeInTheDocument()
    expect(screen.queryByText('Gennemgå årsregnskab')).not.toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 1 opgaver')

    // Filter by Mellem priority (none in initial mock data)
    const medFilterBtn = screen.getByRole('button', { name: 'Mellem' })
    await user.click(medFilterBtn)

    expect(screen.queryByText('Forbered generalforsamling')).not.toBeInTheDocument()
    expect(screen.queryByText('Gennemgå årsregnskab')).not.toBeInTheDocument()
    expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 0 opgaver')

    // Restore "Alle prioriteter"
    const allPriorityBtn = screen.getByRole('button', { name: 'Alle prioriteter' })
    await user.click(allPriorityBtn)

    expect(screen.getByText('Forbered generalforsamling')).toBeInTheDocument()
    expect(screen.getByText('Gennemgå årsregnskab')).toBeInTheDocument()
    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 3 opgaver')

    // Combined filter: Person = Christoffer Burgess, Priority = Høj
    const christofferBtn = screen.getByRole('button', { name: 'Christoffer Burgess' })
    await user.click(christofferBtn)
    await user.click(highFilterBtn)

    expect(screen.getByText('Forbered generalforsamling')).toBeInTheDocument()
    expect(screen.queryByText('Gennemgå årsregnskab')).not.toBeInTheDocument()
    expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    expect(screen.getByText(/Viser/)).toHaveTextContent('Viser 1 opgaver')
  })

  it('denies access and displays error message for unauthorized user email', async () => {
    mockAuthState = {
      uid: 'unauthorized-user-999',
      displayName: 'Hacker Bob',
      email: 'unauthorized@example.com',
    }
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /adgang nægtet/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/unauthorized@example\.com.*ikke tilladelse/i)).toBeInTheDocument()
    expect(screen.queryByText('Forbered generalforsamling')).not.toBeInTheDocument()
  })

  it('supports collapsing each bucket into a stacked view showing just the title and expands back', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Initial expanded state in To Do / Backlog column shows description
    expect(screen.getByText('Forbered generalforsamling')).toBeInTheDocument()
    expect(screen.getByText('Udsend dagsorden og indkaldelse 14 dage før.')).toBeInTheDocument()

    // Find collapse button for Kommende opgaver column
    const todoCollapseBtn = screen.getByRole('button', { name: /fold kommende opgaver sammen/i })
    expect(todoCollapseBtn).toBeInTheDocument()

    // Click collapse button
    await user.click(todoCollapseBtn)

    // Title is still visible in stacked view
    expect(screen.getByText('Forbered generalforsamling')).toBeInTheDocument()

    // Description is no longer visible in stacked view
    expect(screen.queryByText('Udsend dagsorden og indkaldelse 14 dage før.')).not.toBeInTheDocument()

    // Clicking a stacked card still opens the edit modal
    await user.click(screen.getByText('Forbered generalforsamling'))
    expect(screen.getByRole('heading', { name: /rediger opgave/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Forbered generalforsamling')).toBeInTheDocument()

    // Close the edit modal
    const cancelBtn = screen.getByRole('button', { name: /annuller/i })
    await user.click(cancelBtn)

    // Expand the column back
    const todoExpandBtn = screen.getByRole('button', { name: /udvid kommende opgaver/i })
    await user.click(todoExpandBtn)

    // Description is visible again
    expect(screen.getByText('Udsend dagsorden og indkaldelse 14 dage før.')).toBeInTheDocument()

    // Igangværende and Færdiggjort buckets can also be collapsed independently
    const inProgressCollapseBtn = screen.getByRole('button', { name: /fold igangværende sammen/i })
    await user.click(inProgressCollapseBtn)
    expect(screen.getByText('Gennemgå årsregnskab')).toBeInTheDocument()
    expect(screen.queryByText('Tjek bilag og stem overens med bankkonto.')).not.toBeInTheDocument()

    const doneCollapseBtn = screen.getByRole('button', { name: /fold færdiggjort sammen/i })
    await user.click(doneCollapseBtn)
    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    expect(screen.queryByText('Hækklipning og rensning af tagrender.')).not.toBeInTheDocument()
  })

  it('defaults to no deadline date and saves timestamps when creating and editing cards', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open create modal
    const createBtn = screen.getByRole('button', { name: /opret ny opgave/i })
    await user.click(createBtn)

    // Deadline input should be empty by default
    const dateInputs = screen.getAllByDisplayValue('')
    const deadlineInput = dateInputs.find((input) => input.getAttribute('type') === 'date')
    expect(deadlineInput).toBeInTheDocument()
    expect(deadlineInput.value).toBe('')

    // Fill in title and submit without setting a deadline
    const titleInput = screen.getByPlaceholderText(/f\.eks\. Klargør regnskab til generalforsamling/i)
    await user.type(titleInput, 'Opgave uden deadline')

    const submitBtn = screen.getByRole('button', { name: /tilføj opgave/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /opret ny opgave/i })).not.toBeInTheDocument()
    })

    // Find the newly created card in mock data
    const createdCard = mockCardsData.find((c) => c.title === 'Opgave uden deadline')
    expect(createdCard).toBeDefined()
    expect(createdCard.dueDate).toBe('')
    expect(createdCard.createdAt).toBe('MOCK_TIMESTAMP')
    expect(createdCard.timestamp).toBe('MOCK_TIMESTAMP')

    // On board, card title is displayed
    expect(screen.getByText('Opgave uden deadline')).toBeInTheDocument()

    // Now edit the card
    await user.click(screen.getByText('Opgave uden deadline'))
    expect(screen.getByRole('heading', { name: /rediger opgave/i })).toBeInTheDocument()

    const saveBtn = screen.getByRole('button', { name: /gem ændringer/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /rediger opgave/i })).not.toBeInTheDocument()
    })

    const updatedCard = mockCardsData.find((c) => c.title === 'Opgave uden deadline')
    expect(updatedCard.updatedAt).toBe('MOCK_TIMESTAMP')
  })

  it('renders URLs in card description as clickable links with safe attributes', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open create modal
    const createBtn = screen.getByRole('button', { name: /opret ny opgave/i })
    await user.click(createBtn)

    const titleInput = screen.getByPlaceholderText(/f\.eks\. Klargør regnskab til generalforsamling/i)
    const descInput = screen.getByPlaceholderText(/Detaljer om opgaven og hvad der skal gøres\.\.\./i)

    fireEvent.change(titleInput, { target: { value: 'Dokumentationsopgave' } })
    fireEvent.change(descInput, { target: { value: 'Se vejledning på https://example.com/docs og referer til www.forening.dk for detaljer.' } })

    const submitBtn = screen.getByRole('button', { name: /tilføj opgave/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /opret ny opgave/i })).not.toBeInTheDocument()
    })

    // Find links in description
    const httpsLink = screen.getByRole('link', { name: 'https://example.com/docs' })
    expect(httpsLink).toBeInTheDocument()
    expect(httpsLink).toHaveAttribute('href', 'https://example.com/docs')
    expect(httpsLink).toHaveAttribute('target', '_blank')
    expect(httpsLink).toHaveAttribute('rel', 'noopener noreferrer')

    const wwwLink = screen.getByRole('link', { name: 'www.forening.dk' })
    expect(wwwLink).toBeInTheDocument()
    expect(wwwLink).toHaveAttribute('href', 'https://www.forening.dk')
    expect(wwwLink).toHaveAttribute('target', '_blank')
    expect(wwwLink).toHaveAttribute('rel', 'noopener noreferrer')

    // Clicking the link shouldn't open the edit modal due to stopPropagation
    await user.click(httpsLink)
    expect(screen.queryByRole('heading', { name: /rediger opgave/i })).not.toBeInTheDocument()
  })

  it('renders long URLs and URLs with subdirectories/query strings completely without truncating', async () => {
    const user = userEvent.setup()
    render(<App />)

    const createBtn = screen.getByRole('button', { name: /opret ny opgave/i })
    await user.click(createBtn)

    const titleInput = screen.getByPlaceholderText(/f\.eks\. Klargør regnskab til generalforsamling/i)
    const descInput = screen.getByPlaceholderText(/Detaljer om opgaven og hvad der skal gøres\.\.\./i)

    const longUrl = 'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?gsessionid=RVf0h5ev2IIAY_99W4SGHi6qIF5kjB7LHAirJsRxTjPJb7q5EtUJlg&status=active#section'
    fireEvent.change(titleInput, { target: { value: 'Opgave med lang URL' } })
    fireEvent.change(descInput, { target: { value: `Her er et link: ${longUrl}. Tjek det venligst.` } })

    const submitBtn = screen.getByRole('button', { name: /tilføj opgave/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /opret ny opgave/i })).not.toBeInTheDocument()
    })

    const renderedLink = screen.getByRole('link', { name: longUrl })
    expect(renderedLink).toBeInTheDocument()
    expect(renderedLink).toHaveAttribute('href', longUrl)
  })

  it('renders horizontal mobile tabs for buckets and supports switching tabs', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Mobile tablist should be rendered
    const tablist = screen.getByRole('tablist', { name: /opgavestatus kolonner/i })
    expect(tablist).toBeInTheDocument()

    // 3 tabs: Kommende opgaver, Igangværende, Færdiggjort
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs.length).toBe(3)

    const todoTab = within(tablist).getByRole('tab', { name: /kommende opgaver/i })
    const inProgressTab = within(tablist).getByRole('tab', { name: /igangværende/i })
    const doneTab = within(tablist).getByRole('tab', { name: /færdiggjort/i })

    // By default, Kommende opgaver tab is active
    expect(todoTab).toHaveAttribute('aria-selected', 'true')
    expect(inProgressTab).toHaveAttribute('aria-selected', 'false')
    expect(doneTab).toHaveAttribute('aria-selected', 'false')

    // Click Igangværende tab
    await user.click(inProgressTab)
    expect(inProgressTab).toHaveAttribute('aria-selected', 'true')
    expect(todoTab).toHaveAttribute('aria-selected', 'false')

    // Click Færdiggjort tab
    await user.click(doneTab)
    expect(doneTab).toHaveAttribute('aria-selected', 'true')
    expect(inProgressTab).toHaveAttribute('aria-selected', 'false')
  })

  it('supports drag-and-drop onto mobile tab buttons to move cards between buckets', async () => {
    render(<App />)

    const tablist = screen.getByRole('tablist', { name: /opgavestatus kolonner/i })
    const inProgressTab = within(tablist).getByRole('tab', { name: /igangværende/i })

    // Simulate drag and drop of card-1 ('todo') onto In Progress tab
    const mockDataTransfer = {
      getData: (format) => (format === 'text/plain' ? 'card-1' : ''),
      dropEffect: 'move',
    }

    fireEvent.dragOver(inProgressTab, { dataTransfer: mockDataTransfer })
    fireEvent.drop(inProgressTab, { dataTransfer: mockDataTransfer })

    await waitFor(() => {
      expect(mockCardsData.find((c) => c.id === 'card-1').columnId).toBe('in_progress')
    })
  })

  it('renders all bucket panels in the horizontal carousel and supports direct drag-and-drop to adjacent bucket panels', async () => {
    render(<App />)

    // Verify all 3 panels are rendered in the DOM
    const todoPanel = document.getElementById('panel-todo')
    const inProgressPanel = document.getElementById('panel-in_progress')
    const donePanel = document.getElementById('panel-done')

    expect(todoPanel).toBeInTheDocument()
    expect(inProgressPanel).toBeInTheDocument()
    expect(donePanel).toBeInTheDocument()

    // Simulate drag and drop of card-2 ('in_progress') onto the visible Done bucket panel
    const mockDataTransfer = {
      getData: (format) => (format === 'text/plain' ? 'card-2' : ''),
      dropEffect: 'move',
    }

    fireEvent.dragOver(donePanel, { dataTransfer: mockDataTransfer })
    fireEvent.drop(donePanel, { dataTransfer: mockDataTransfer })

    await waitFor(() => {
      expect(mockCardsData.find((c) => c.id === 'card-2').columnId).toBe('done')
    })
  })

  it('archives done tasks, shows them in archive view, and supports unarchive back to active board', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()

    const archiveButtons = screen.getAllByRole('button', { name: /arkivér opgave/i })
    await user.click(archiveButtons[0])

    const archiveDialog = screen.getByRole('dialog')
    await user.click(within(archiveDialog).getByRole('button', { name: /arkivér opgave/i }))

    await waitFor(() => {
      expect(screen.queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    })

    const showArchiveButton = screen.getByRole('button', { name: /vis arkiv/i })
    await user.click(showArchiveButton)

    await waitFor(() => {
      expect(screen.getByText('Arkiveret (ukendt år)')).toBeInTheDocument()
      expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /udvid arkiveret \(ukendt år\)/i }))

    await waitFor(() => {
      expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    })

    const restoreButtons = screen.getAllByRole('button', { name: /gendan opgave/i })
    await user.click(restoreButtons[0])

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /gendan opgave/i })).not.toBeInTheDocument()
      expect(screen.getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    })
  })

  it('keeps archive years collapsed by default and only keeps one year bucket expanded at a time', async () => {
    const user = userEvent.setup()

    mockCardsData.push(
      {
        id: 'archive-2025',
        title: 'Snerydning vintervagt 2025',
        description: 'Afsluttet indsats fra vinterberedskab.',
        columnId: 'archive',
        assignees: ['Jacob Simonsen'],
        assignee: 'Jacob Simonsen',
        priority: 'Medium',
        dueDate: '2025-01-15',
        archivedAt: { toDate: () => new Date('2025-02-10T10:00:00Z') },
      },
      {
        id: 'archive-2024',
        title: 'Snerydning vintervagt 2024',
        description: 'Afsluttet indsats fra vinterberedskab.',
        columnId: 'archive',
        assignees: ['Erik Bjerg'],
        assignee: 'Erik Bjerg',
        priority: 'Low',
        dueDate: '2024-01-15',
        archivedAt: { toDate: () => new Date('2024-02-10T10:00:00Z') },
      }
    )

    render(<App />)

    await user.click(screen.getByRole('button', { name: /vis arkiv/i }))

    expect(screen.getByText('Arkiveret i 2025')).toBeInTheDocument()
    expect(screen.getByText('Arkiveret i 2024')).toBeInTheDocument()
    expect(screen.getByText('Snerydning vintervagt 2025')).toBeInTheDocument()
    expect(screen.getByText('Snerydning vintervagt 2024')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /gendan opgave/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /udvid arkiveret i 2025/i }))

    expect(screen.getByText('Snerydning vintervagt 2025')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fold arkiveret i 2025 sammen/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /udvid arkiveret i 2024/i }))

    expect(screen.getByText('Snerydning vintervagt 2024')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /udvid arkiveret i 2025/i })).toBeInTheDocument()
  })

  it('syncs card updates automatically between two simultaneous users', async () => {
    const userA = userEvent.setup()

    const clientA = render(<App />)
    const clientB = render(<App />)

    await waitFor(() => {
      expect(within(clientA.container).getByText('Forbered generalforsamling')).toBeInTheDocument()
      expect(within(clientB.container).getByText('Forbered generalforsamling')).toBeInTheDocument()
    })

    const createTaskButtonA = within(clientA.container).getByRole('button', { name: /opret ny opgave/i })
    await userA.click(createTaskButtonA)

    const titleInputA = within(clientA.container).getByPlaceholderText(/f\.eks\. Klargør regnskab til generalforsamling/i)
    const descInputA = within(clientA.container).getByPlaceholderText(/Detaljer om opgaven og hvad der skal gøres\.\.\./i)

    await userA.type(titleInputA, 'Synk test opgave')
    await userA.type(descInputA, 'Denne opgave blev oprettet af bruger A')

    const submitButtonA = within(clientA.container).getByRole('button', { name: /tilføj opgave/i })
    await userA.click(submitButtonA)

    await waitFor(() => {
      expect(within(clientB.container).getByText('Synk test opgave')).toBeInTheDocument()
    })

    const archiveButtonsA = within(clientA.container).getAllByRole('button', { name: /arkivér opgave/i })
    await userA.click(archiveButtonsA[0])

    const archiveDialogA = within(clientA.container).getByRole('dialog')
    await userA.click(within(archiveDialogA).getByRole('button', { name: /arkivér opgave/i }))

    await waitFor(() => {
      expect(within(clientB.container).queryByText('Bestil havemand til forårsrengøring')).not.toBeInTheDocument()
    })

    const showArchiveButtonA = within(clientA.container).getByRole('button', { name: /vis arkiv/i })
    const showArchiveButtonB = within(clientB.container).getByRole('button', { name: /vis arkiv/i })

    await userA.click(showArchiveButtonA)
    await userA.click(showArchiveButtonB)

    await waitFor(() => {
      expect(within(clientA.container).getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
      expect(within(clientB.container).getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    })

    await userA.click(within(clientA.container).getByRole('button', { name: /udvid arkiveret \(ukendt år\)/i }))

    const restoreButtonsA = within(clientA.container).getAllByRole('button', { name: /gendan opgave/i })
    await userA.click(restoreButtonsA[0])

    await waitFor(() => {
      expect(within(clientA.container).queryByRole('button', { name: /gendan opgave/i })).not.toBeInTheDocument()
      expect(within(clientB.container).queryByRole('button', { name: /gendan opgave/i })).not.toBeInTheDocument()
      expect(within(clientB.container).getByText('Bestil havemand til forårsrengøring')).toBeInTheDocument()
    })
  })

  it('allows adding sub-tasks with checkboxes when creating a task and displaying them on the board', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /opret ny opgave/i }))

    await user.type(
      screen.getByPlaceholderText(/f\.eks\. Klargør regnskab til generalforsamling/i),
      'Opgave med delopgaver'
    )
    await user.type(
      screen.getByPlaceholderText(/Detaljer om opgaven og hvad der skal gøres\.\.\./i),
      'Beskrivelse af hovedopgave'
    )

    const subtaskInput = screen.getByPlaceholderText(/Tilføj en del-opgave\.\.\./i)
    await user.type(subtaskInput, 'Første del-opgave')
    await user.click(screen.getByRole('button', { name: /tilføj$/i }))

    await user.type(subtaskInput, 'Anden del-opgave{Enter}')

    expect(screen.getByDisplayValue('Første del-opgave')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Anden del-opgave')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /tilføj opgave/i }))

    await waitFor(() => {
      expect(screen.getByText('Opgave med delopgaver')).toBeInTheDocument()
      expect(screen.getByText('Første del-opgave')).toBeInTheDocument()
      expect(screen.getByText('Anden del-opgave')).toBeInTheDocument()
    })

    const firstSubtaskCheckbox = screen.getByRole('checkbox', { name: /første del-opgave/i })
    expect(firstSubtaskCheckbox).not.toBeChecked()

    await user.click(firstSubtaskCheckbox)

    await waitFor(() => {
      expect(firstSubtaskCheckbox).toBeChecked()
    })
  })

  it('allows adding, editing, checking, and removing sub-tasks when editing an existing task', async () => {
    const user = userEvent.setup()

    mockCardsData.push({
      id: 'card-with-subtasks',
      title: 'Klargør havemøbler',
      description: 'Gør terrasse klar til sommer',
      columnId: 'todo',
      assignees: ['Jacob Simonsen'],
      assignee: 'Jacob Simonsen',
      priority: 'Medium',
      subtasks: [
        { id: 'sub-1', title: 'Vask borde og stole', completed: false },
        { id: 'sub-2', title: 'Giv olie', completed: true },
      ],
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Klargør havemøbler')).toBeInTheDocument()
      expect(screen.getByText('Vask borde og stole')).toBeInTheDocument()
      expect(screen.getByText('Giv olie')).toBeInTheDocument()
    })

    // Click on card to open edit modal
    await user.click(screen.getByText('Klargør havemøbler'))

    const modal = screen.getByRole('dialog')
    expect(within(modal).getByDisplayValue('Vask borde og stole')).toBeInTheDocument()
    expect(within(modal).getByDisplayValue('Giv olie')).toBeInTheDocument()

    // Add another subtask
    const subtaskInput = within(modal).getByPlaceholderText(/Tilføj en del-opgave\.\.\./i)
    await user.type(subtaskInput, 'Køb nye hynder')
    await user.click(within(modal).getByRole('button', { name: /tilføj$/i }))

    // Remove the first subtask inside the modal
    const removeButtons = within(modal).getAllByRole('button', { name: /slet del-opgave|fjern del-opgave/i })
    await user.click(removeButtons[0])

    await user.click(within(modal).getByRole('button', { name: /gem ændringer/i }))

    await waitFor(() => {
      expect(screen.queryByText('Vask borde og stole')).not.toBeInTheDocument()
      expect(screen.getByText('Giv olie')).toBeInTheDocument()
      expect(screen.getByText('Køb nye hynder')).toBeInTheDocument()
    })
  })

  it('allows toggling and deleting sub-tasks directly from board cards', async () => {
    const user = userEvent.setup()

    mockCardsData.push({
      id: 'card-with-subtasks-board',
      title: 'Forbered sommerfest',
      description: 'Husk følgende til festen',
      columnId: 'todo',
      assignees: ['Jacob Simonsen'],
      assignee: 'Jacob Simonsen',
      priority: 'High',
      subtasks: [
        { id: 'sub-a', title: 'Køb grillkul', completed: false },
        { id: 'sub-b', title: 'Bestil telt', completed: true },
        { id: 'sub-c', title: 'Lav spilleliste', completed: false },
      ],
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Forbered sommerfest')).toBeInTheDocument()
      expect(screen.getByText('Husk følgende til festen')).toBeInTheDocument()
      expect(screen.getByText('Køb grillkul')).toBeInTheDocument()
      expect(screen.getByText('Bestil telt')).toBeInTheDocument()
      expect(screen.getByText('Lav spilleliste')).toBeInTheDocument()
    })

    // Checkbox for "Køb grillkul" should be unchecked, "Bestil telt" should be checked
    const grillCheckbox = screen.getByRole('checkbox', { name: /køb grillkul/i })
    const tentCheckbox = screen.getByRole('checkbox', { name: /bestil telt/i })
    expect(grillCheckbox).not.toBeChecked()
    expect(tentCheckbox).toBeChecked()

    // Counter "1/3" should appear exactly once on the card (in the subtask header)
    //const cardEl = screen.getByText('Forbered sommerfest').closest('div')
    expect(screen.getAllByText('1/3').length).toBe(1)

    // Toggle "Køb grillkul"
    await user.click(grillCheckbox)
    await waitFor(() => {
      expect(grillCheckbox).toBeChecked()
    })

    // After toggling, counter updates to "2/3" and appears exactly once
    expect(screen.getAllByText('2/3').length).toBe(1)

    // Delete "Lav spilleliste" using the delete icon
    const deleteButtons = screen.getAllByRole('button', { name: /slet del-opgave/i })
    await user.click(deleteButtons[2])

    await waitFor(() => {
      expect(screen.queryByText('Lav spilleliste')).not.toBeInTheDocument()
      expect(screen.getByText('Køb grillkul')).toBeInTheDocument()
      expect(screen.getByText('Bestil telt')).toBeInTheDocument()
    })
  })
})
