import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthModal from '../AuthModal'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail
} from '../firebase'

vi.mock('../firebase', () => {
  return {
    auth: { currentUser: null },
    googleProvider: {},
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
  }
})

describe('AuthModal Tests', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks login when email is not in users.json and shows error message', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={onClose} />)

    const emailInput = screen.getByPlaceholderText('din@email.dk')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitBtn = screen.getByRole('button', { name: /log ind/i })

    await user.type(emailInput, 'stranger@example.com')
    await user.type(passwordInput, 'secret123')
    await user.click(submitBtn)

    expect(screen.getByText('Adgang nægtet. Denne e-mailadresse er ikke godkendt til at logge ind.')).toBeInTheDocument()
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('allows login when email is in users.json', async () => {
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: { email: 'bjerg1@webspeed.dk' } })

    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={onClose} />)

    const emailInput = screen.getByPlaceholderText('din@email.dk')
    const passwordInput = screen.getByPlaceholderText('••••••••')
    const submitBtn = screen.getByRole('button', { name: /log ind/i })

    await user.type(emailInput, 'bjerg1@webspeed.dk')
    await user.type(passwordInput, 'validpass123')
    await user.click(submitBtn)

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'bjerg1@webspeed.dk', 'validpass123')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('blocks Google sign in when returned google account is unauthorized', async () => {
    signInWithPopup.mockResolvedValueOnce({
      user: { email: 'unauthorized-google@gmail.com' },
    })

    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={onClose} />)

    const googleBtn = screen.getByRole('button', { name: /fortsæt med google/i })
    await user.click(googleBtn)

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled()
      expect(screen.getByText(/Adgang nægtet.*unauthorized-google@gmail\.com/i)).toBeInTheDocument()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  it('allows Google sign in when returned google account is in users.json', async () => {
    signInWithPopup.mockResolvedValueOnce({
      user: { email: 'leonid.bresjnev@gmail.com', displayName: 'Jacob Simonsen' },
    })

    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={onClose} />)

    const googleBtn = screen.getByRole('button', { name: /fortsæt med google/i })
    await user.click(googleBtn)

    await waitFor(() => {
      expect(signOut).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('switches to forgot email view when clicking "Glemt email?" and blocks unauthorized email', async () => {
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={onClose} />)

    const forgotBtn = screen.getByRole('button', { name: /glemt email\?/i })
    await user.click(forgotBtn)

    expect(screen.getByRole('heading', { name: /glemt email eller adgangskode/i })).toBeInTheDocument()

    const emailInput = screen.getByPlaceholderText('din@email.dk')
    const sendBtn = screen.getByRole('button', { name: /send nulstillingsmail/i })

    await user.type(emailInput, 'stranger@example.com')
    await user.click(sendBtn)

    expect(screen.getByText('Adgang nægtet. Denne e-mailadresse er ikke godkendt til at logge ind.')).toBeInTheDocument()
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('sends password reset email via Firebase for authorized user and allows navigation back to login', async () => {
    sendPasswordResetEmail.mockResolvedValueOnce()
    const user = userEvent.setup()
    render(<AuthModal isOpen={true} onClose={onClose} />)

    // Switch to forgot email view
    const forgotBtn = screen.getByRole('button', { name: /glemt email\?/i })
    await user.click(forgotBtn)

    const emailInput = screen.getByPlaceholderText('din@email.dk')
    const sendBtn = screen.getByRole('button', { name: /send nulstillingsmail/i })

    await user.type(emailInput, 'bjerg1@webspeed.dk')
    await user.click(sendBtn)

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'bjerg1@webspeed.dk')
      expect(screen.getByText(/Vi har sendt en e-mail til bjerg1@webspeed\.dk/i)).toBeInTheDocument()
    })

    // Return to login
    const backBtn = screen.getByRole('button', { name: /tilbage til login/i })
    await user.click(backBtn)

    expect(screen.getByRole('heading', { name: /log ind på scrumboard/i })).toBeInTheDocument()
  })
})
