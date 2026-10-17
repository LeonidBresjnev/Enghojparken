import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { translations, DEFAULT_LANGUAGE, getTranslation } from '../i18n'

let mockAuthState = {
  uid: 'test-user-123',
  displayName: 'Jacob Simonsen',
  email: 'leonid.bresjnev@gmail.com',
  photoURL: 'https://example.com/photo.jpg',
}

vi.mock('../firebase', () => {
  return {
    auth: { currentUser: null },
    db: {},
    googleProvider: {},
    signInWithPopup: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: () => 'MOCK_TIMESTAMP',
    onAuthStateChanged: (auth, callback) => {
      callback(mockAuthState)
      return () => {}
    },
    onSnapshot: (query, callback) => {
      callback({
        docs: [
          {
            id: 'card-1',
            data: () => ({
              title: 'Test Task 1',
              description: 'Description 1',
              columnId: 'todo',
              priority: 'High',
              assignees: ['Jacob Simonsen'],
            }),
          },
        ],
      })
      return () => {}
    },
  }
})

describe('Internationalization and LanguageSelector Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockAuthState = {
      uid: 'test-user-123',
      displayName: 'Jacob Simonsen',
      email: 'leonid.bresjnev@gmail.com',
      photoURL: 'https://example.com/photo.jpg',
    }
  })

  it('defaults to Danish language with Danish column titles and headers', () => {
    render(<App />)

    expect(DEFAULT_LANGUAGE).toBe('da')
    // App header title in Danish
    expect(screen.getByRole('heading', { name: /bestyrelsens scrumboard/i })).toBeInTheDocument()
    // Column titles in Danish
    expect(screen.getByRole('heading', { name: 'Kommende opgaver' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Igangværende' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Færdiggjort' })).toBeInTheDocument()

    // Create task button in Danish
    expect(screen.getByRole('button', { name: /opret ny opgave/i })).toBeInTheDocument()
  })

  it('renders language selector button in header and switches language to English', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Language selector button exists
    const langBtn = screen.getByRole('button', { name: /vælg sprog \/ select language/i })
    expect(langBtn).toBeInTheDocument()
    expect(langBtn).toHaveTextContent('DA')

    // Open language menu
    await user.click(langBtn)

    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    expect(within(menu).getByText('Dansk')).toBeInTheDocument()
    expect(within(menu).getByText('English')).toBeInTheDocument()

    // Click English option
    const englishOption = within(menu).getByText('English')
    await user.click(englishOption)

    // Header and columns should now be in English
    expect(screen.getByRole('heading', { name: /board scrumboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Upcoming tasks' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'In progress' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Completed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create new task/i })).toBeInTheDocument()

    // Button in header now shows EN
    expect(langBtn).toHaveTextContent('EN')

    // Language selection is saved to localStorage
    expect(localStorage.getItem('app_language')).toBe('en')
  })

  it('switches back from English to Danish', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="en" />)

    expect(screen.getByRole('heading', { name: /board scrumboard/i })).toBeInTheDocument()

    const langBtn = screen.getByRole('button', { name: /vælg sprog \/ select language/i })
    await user.click(langBtn)

    const danishOption = screen.getByRole('menuitem', { name: /dansk/i })
    await user.click(danishOption)

    expect(screen.getByRole('heading', { name: /bestyrelsens scrumboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kommende opgaver' })).toBeInTheDocument()
    expect(localStorage.getItem('app_language')).toBe('da')
  })

  it('translates modal forms when language is set to English', async () => {
    const user = userEvent.setup()
    render(<App initialLanguage="en" />)

    const createBtn = screen.getByRole('button', { name: /create new task/i })
    await user.click(createBtn)

    expect(screen.getByRole('heading', { name: /create new task/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. Prepare financial statement for annual general meeting/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('has complete translation files for Danish and English with matching keys', () => {
    const daKeys = Object.keys(translations.da)
    const enKeys = Object.keys(translations.en)
    expect(daKeys).toEqual(enKeys)

    expect(translations.da.columns.todo).toBe('Kommende opgaver')
    expect(translations.en.columns.todo).toBe('Upcoming tasks')
    expect(translations.da.columns.in_progress).toBe('Igangværende')
    expect(translations.en.columns.in_progress).toBe('In progress')
    expect(translations.da.columns.done).toBe('Færdiggjort')
    expect(translations.en.columns.done).toBe('Completed')

    // Priority translations
    expect(translations.da.priority.high).toBe('Høj')
    expect(translations.da.priority.medium).toBe('Mellem')
    expect(translations.da.priority.low).toBe('Lav')
    expect(translations.en.priority.high).toBe('High')
    expect(translations.en.priority.medium).toBe('Medium')
    expect(translations.en.priority.low).toBe('Low')
  })

  it('translates priority badges and priority filter buttons on language switch', async () => {
    const user = userEvent.setup()
    render(<App />)

    // In Danish, filter button has 'Høj' and card-1 badge has 'Høj'
    const highFilterBtn = screen.getByRole('button', { name: 'Høj' })
    expect(highFilterBtn).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alle prioriteter' })).toBeInTheDocument()

    const card = screen.getByText('Test Task 1').closest('div')
    expect(within(card).getByText('Høj')).toBeInTheDocument()

    // Switch to English
    const langBtn = screen.getByRole('button', { name: /vælg sprog \/ select language/i })
    await user.click(langBtn)
    const englishOption = screen.getByRole('menuitem', { name: /english/i })
    await user.click(englishOption)

    // Now priority filter button is 'High' and card badge is 'High'
    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All priorities' })).toBeInTheDocument()
    expect(within(card).getByText('High')).toBeInTheDocument()
  })
})
