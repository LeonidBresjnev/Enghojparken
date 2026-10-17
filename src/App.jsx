import { useState, useEffect, useMemo, useRef } from 'react'
import headerBg from './assets/cropped-gf-logo.jpg'
import {
  auth,
  signOut,
  onAuthStateChanged,
  db,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from './firebase'
import { isUserAllowed, getAllowedUser, getAllowedUserNames } from './allowedUsers'
import AuthModal from './AuthModal'
import { I18nProvider, useTranslation } from './i18n'
import LanguageSelector from './components/LanguageSelector'
import {
  Plus,
  Trash2,
  Calendar,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Edit3,
  X,
  Check,
  LogIn,
  LogOut,
  Loader2,
  AlertTriangle,
  Users,
  Lock,
  ShieldCheck
} from 'lucide-react'

// Helper to normalize assignees from card (handles string or array for backwards compatibility)
function getCardAssignees(card) {
  if (!card) return []
  if (Array.isArray(card.assignees)) return card.assignees
  if (Array.isArray(card.assignee)) return card.assignee
  if (typeof card.assignee === 'string' && card.assignee.trim()) {
    if (card.assignee === 'Udefineret' || card.assignee === 'Unassigned') return []
    // Support comma-separated strings if any exist
    return card.assignee.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

// Multi-select Dropdown Component with Checkmarks for Board Members
function AssigneeDropdown({ boardMembers, selectedAssignees, onChange }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleMember = (member) => {
    if (selectedAssignees.includes(member)) {
      onChange(selectedAssignees.filter((m) => m !== member))
    } else {
      onChange([...selectedAssignees, member])
    }
  }

  const selectedCount = selectedAssignees.length

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-left transition-colors cursor-pointer shadow-2xs"
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <Users className="w-4 h-4 text-slate-400 shrink-0" />
          {selectedCount === 0 ? (
            <span className="text-slate-400 italic">{t('assignee.selectPlaceholder')}</span>
          ) : (
            <div className="flex flex-wrap gap-1 items-center">
              {selectedAssignees.slice(0, 2).map((m, idx) => (
                <span
                  key={idx}
                  className="bg-sky-100 text-sky-800 text-xs px-2 py-0.5 rounded-md font-medium truncate max-w-[150px]"
                >
                  {m}
                </span>
              ))}
              {selectedCount > 2 && (
                <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-md font-medium">
                  {t('assignee.moreCount', { count: selectedCount - 2 })}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-sky-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-60 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1.5 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>{t('assignee.boardMembersTitle')}</span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-sky-600 hover:text-sky-800 font-normal normal-case cursor-pointer"
              >
                {t('assignee.deselectAll')}
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1 flex flex-col gap-0.5">
            {boardMembers.map((member, idx) => {
              const isSelected = selectedAssignees.includes(member)
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => toggleMember(member)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-950 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{member}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-sky-600 font-semibold bg-sky-100/80 px-1.5 py-0.5 rounded shrink-0">
                      {t('assignee.selectedBadge')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const renderDescriptionWithLinks = (text) => {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  const parts = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    let url = match[0]
    let trailingPunctuation = ''

    const punctMatch = url.match(/[.,;:!?]+$/)
    if (punctMatch) {
      trailingPunctuation = punctMatch[0]
      url = url.slice(0, -trailingPunctuation.length)
    }

    const href = url.startsWith('www.') ? `https://${url}` : url
    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-sky-600 hover:text-sky-800 underline break-all font-medium transition-colors"
      >
        {url}
      </a>
    )

    if (trailingPunctuation) {
      parts.push(trailingPunctuation)
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

function BoardApp() {
  const { t } = useTranslation()
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [accessDeniedError, setAccessDeniedError] = useState('')
  const [cards, setCards] = useState([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [firestoreError, setFirestoreError] = useState(null)
  const [selectedAssignee, setSelectedAssignee] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [cardToDelete, setCardToDelete] = useState(null)
  const [draggedCardId, setDraggedCardId] = useState(null)
  const [dragOverColId, setDragOverColId] = useState(null)
  const [collapsedColumns, setCollapsedColumns] = useState({})
  const [activeMobileTab, setActiveMobileTab] = useState('todo')

  const columns = useMemo(() => [
    { id: 'todo', title: t('columns.todo'), color: 'border-amber-400', badgeBg: 'bg-amber-100 text-amber-800' },
    { id: 'in_progress', title: t('columns.in_progress'), color: 'border-blue-500', badgeBg: 'bg-blue-100 text-blue-800' },
    { id: 'done', title: t('columns.done'), color: 'border-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800' },
  ], [t])

  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    columnId: 'todo',
    assignees: [],
    priority: 'Medium',
    dueDate: '',
  })

  const toggleColumnCollapse = (columnId) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }))
  }

  // Use names from users.json as the persons who can be dedicated to a task
  const boardMembers = useMemo(() => {
    return getAllowedUserNames()
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isUserAllowed(user.email)) {
          setCurrentUser(user)
          setAccessDeniedError('')
        } else {
          try {
            await signOut(auth)
          } catch (e) {
            console.error('Error signing out unauthorized user:', e)
          }
          setCurrentUser(null)
          setAccessDeniedError(`Adgang nægtet: E-mailadressen (${user.email || 'ukendt'}) har ikke tilladelse til at logge ind.`)
        }
      } else {
        setCurrentUser(null)
      }
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Subscribe to real-time updates from Firestore only when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      return
    }

    const cardsCollection = collection(db, 'cards')
    const cardsQuery = query(cardsCollection, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      cardsQuery,
      (snapshot) => {
        const fetchedCards = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        setCards(fetchedCards)
        setLoadingCards(false)
        setFirestoreError(null)
      },
      (error) => {
        console.error('Error fetching cards from Firestore:', error)
        setFirestoreError('Kunne ikke hente opgaver fra Firestore. Tjek forbindelsen eller Firestore regler.')
        setLoadingCards(false)
      }
    )

    return () => unsubscribe()
  }, [currentUser])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setCurrentUser(null)
      setCards([])
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  // Helper to normalize priority values for comparison and display
  const normalizePriority = (p) => {
    if (!p) return 'Medium'
    const lower = p.toLowerCase()
    if (lower === 'high' || lower === 'høj') return 'High'
    if (lower === 'medium' || lower === 'mellem') return 'Medium'
    if (lower === 'low' || lower === 'lav') return 'Low'
    return p
  }

  const getPriorityDisplayLabel = (p) => {
    const norm = normalizePriority(p)
    if (norm === 'High') return t('priority.high')
    if (norm === 'Medium') return t('priority.medium')
    if (norm === 'Low') return t('priority.low')
    return p
  }

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (selectedAssignee !== 'All') {
        const cardAssignees = getCardAssignees(card)
        const hasMatch = cardAssignees.some(
          (a) => a === selectedAssignee || a.toLowerCase().includes(selectedAssignee.toLowerCase())
        )
        if (!hasMatch) return false
      }
      if (selectedPriority !== 'All') {
        if (normalizePriority(card.priority) !== normalizePriority(selectedPriority)) {
          return false
        }
      }
      return true
    })
  }, [cards, selectedAssignee, selectedPriority])

  const moveCard = async (id, direction) => {
    const colOrder = ['todo', 'in_progress', 'done']
    const card = cards.find((c) => c.id === id)
    if (!card) return

    const currentIndex = colOrder.indexOf(card.columnId)
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (nextIndex >= 0 && nextIndex < colOrder.length) {
      const nextColumnId = colOrder[nextIndex]
      try {
        const cardRef = doc(db, 'cards', id)
        await updateDoc(cardRef, { columnId: nextColumnId, updatedAt: serverTimestamp() })
      } catch (err) {
        console.error('Error moving card:', err)
      }
    }
  }

  const deleteCard = async (id) => {
    try {
      const cardRef = doc(db, 'cards', id)
      await deleteDoc(cardRef)
      if (editingCard && editingCard.id === id) {
        setEditingCard(null)
      }
    } catch (err) {
      console.error('Error deleting card:', err)
    }
  }

  const handleCreateCard = async (e) => {
    e.preventDefault()
    if (!newCard.title.trim()) return

    const selectedAssignees = Array.isArray(newCard.assignees) ? newCard.assignees : []
    const assigneeString = selectedAssignees.length > 0 ? selectedAssignees.join(', ') : 'Udefineret'

    try {
      const cardData = {
        title: newCard.title.trim(),
        description: newCard.description.trim() || '',
        columnId: newCard.columnId || 'todo',
        assignees: selectedAssignees,
        assignee: assigneeString, // maintain backwards compatibility
        priority: newCard.priority || 'Medium',
        dueDate: newCard.dueDate ? newCard.dueDate.trim() : '',
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
      }

      await addDoc(collection(db, 'cards'), cardData)

      setNewCard({
        title: '',
        description: '',
        columnId: 'todo',
        assignees: [],
        priority: 'Medium',
        dueDate: '',
      })
      setIsCreateModalOpen(false)
    } catch (err) {
      console.error('Error creating card:', err)
      alert('Der opstod en fejl ved oprettelse af opgaven i Firestore: ' + err.message)
    }
  }

  const handleUpdateCard = async (e) => {
    e.preventDefault()
    if (!editingCard || !editingCard.title.trim()) return

    const selectedAssignees = Array.isArray(editingCard.assignees)
      ? editingCard.assignees
      : getCardAssignees(editingCard)
    const assigneeString = selectedAssignees.length > 0 ? selectedAssignees.join(', ') : 'Udefineret'

    try {
      const cardRef = doc(db, 'cards', editingCard.id)
      await updateDoc(cardRef, {
        title: editingCard.title.trim(),
        description: editingCard.description?.trim() || '',
        columnId: editingCard.columnId || 'todo',
        assignees: selectedAssignees,
        assignee: assigneeString, // maintain backwards compatibility
        priority: editingCard.priority || 'Medium',
        dueDate: editingCard.dueDate ? editingCard.dueDate.trim() : '',
        updatedAt: serverTimestamp(),
      })
      setEditingCard(null)
    } catch (err) {
      console.error('Error updating card:', err)
      alert('Der opstod en fejl ved opdatering af opgaven: ' + err.message)
    }
  }

  // Drag and Drop handlers
  const handleDragStart = (e, cardId) => {
    setDraggedCardId(cardId)
    e.dataTransfer.setData('text/plain', cardId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedCardId(null)
    setDragOverColId(null)
  }

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
    if (dragOverColId !== columnId) {
      setDragOverColId(columnId)
    }
  }

  const handleDragLeave = (e, columnId) => {
    // Only reset if leaving column container
    if (e.currentTarget.contains(e.relatedTarget)) return
    if (dragOverColId === columnId) {
      setDragOverColId(null)
    }
  }

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault()
    const cardId = e.dataTransfer?.getData ? e.dataTransfer.getData('text/plain') : draggedCardId
    setDraggedCardId(null)
    setDragOverColId(null)

    if (cardId) {
      const targetCard = cards.find((c) => c.id === cardId)
      if (targetCard && targetCard.columnId !== targetColumnId) {
        try {
          const cardRef = doc(db, 'cards', cardId)
          await updateDoc(cardRef, { columnId: targetColumnId, updatedAt: serverTimestamp() })
        } catch (err) {
          console.error('Error updating card column on drop:', err)
        }
      }
    }
  }

  const getPriorityBadge = (priority) => {
    const norm = normalizePriority(priority)
    switch (norm) {
      case 'High':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'Low':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header with cropped-gf-logo.jpg background - higher transparency for visible background */}
      <header
        className="relative bg-slate-900 text-white shadow-lg bg-cover bg-center overflow-hidden min-h-[170px] flex items-center"
        style={{
          backgroundImage: `url(${headerBg})`,
        }}
      >
        {/* Lighter overlay to let the background image shine through clearly */}
        <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[0.5px]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="p-3 bg-black/40 rounded-xl backdrop-blur-md border border-white/30 shadow-lg">
              <Layers className="w-8 h-8 text-sky-300 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {t('appName')}
                </h1>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-950/60 text-sky-300 border border-sky-400/50 backdrop-blur-sm shadow-sm">
                  <Sparkles className="w-3 h-3" /> {t('communityBoard')}
                </span>
              </div>
              <p className="text-sm md:text-base text-white/90 font-medium mt-1 max-w-xl drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {t('appDescription')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
            {/* Language Selector in Header */}
            <LanguageSelector />

            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-lg">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || currentUser.email}
                    className="w-7 h-7 rounded-full border border-sky-400 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-sky-600 text-white font-semibold text-xs flex items-center justify-center border border-sky-400/50">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col text-left mr-1">
                  <span className="text-xs font-semibold text-white leading-tight max-w-[130px] truncate">
                    {getAllowedUser(currentUser.email)?.name || currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-300 max-w-[130px] truncate leading-tight">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                  title={t('auth.logOut')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/85 hover:bg-slate-800 text-white font-medium text-sm rounded-lg backdrop-blur-md border border-white/25 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-sky-400" />
                {t('auth.logIn')}
              </button>
            )}

            {currentUser ? (
              <button
                onClick={() => {
                  setNewCard({
                    title: '',
                    description: '',
                    columnId: 'todo',
                    assignees: [],
                    priority: 'Medium',
                    dueDate: '',
                  })
                  setIsCreateModalOpen(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border border-sky-400/40"
              >
                <Plus className="w-4 h-4" />
                {t('createTask')}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-600">{t('loadingUserStatus')}</p>
          </div>
        ) : !currentUser ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 text-center max-w-2xl mx-auto my-8">
            {accessDeniedError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm shadow-xs text-left">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-0.5">{t('auth.accessDenied')}</h4>
                  <p className="text-red-800/90 text-xs sm:text-sm">{accessDeniedError}</p>
                </div>
              </div>
            )}
            <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100 shadow-xs">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {t('auth.loginHeaderTitle')}
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
              {t('auth.loginHeaderDescription')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {t('auth.loginPortalButton')}
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{t('auth.accessControlTitle')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-500" />
                <span>{t('auth.boardOnlyTitle')}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {firestoreError && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-sm shadow-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-0.5">{t('auth.firestoreError')}</h4>
                  <p className="text-amber-800/90 text-xs sm:text-sm">{firestoreError}</p>
                </div>
              </div>
            )}

            {/* Controls & Filter bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 max-w-full">
                {/* Person filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  <UserIcon className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                    {t('assignee.label')}
                  </span>
                  <button
                    onClick={() => setSelectedAssignee('All')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                      selectedAssignee === 'All'
                        ? 'bg-sky-600 text-white shadow-sm font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t('assignee.all')}
                  </button>
                  {boardMembers.map((member) => {
                    const isSelected = selectedAssignee === member
                    return (
                      <button
                        key={member}
                        onClick={() => setSelectedAssignee(member)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-sm font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {member}
                      </button>
                    )
                  })}
                </div>

                {/* Priority filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full border-t sm:border-t-0 sm:border-l sm:pl-4 border-slate-200 pt-2 sm:pt-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                    {t('priority.label')}:
                  </span>
                  <button
                    onClick={() => setSelectedPriority('All')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                      selectedPriority === 'All'
                        ? 'bg-sky-600 text-white shadow-sm font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t('priority.all')}
                  </button>
                  {[
                    { value: 'High', label: t('priority.high') },
                    { value: 'Medium', label: t('priority.medium') },
                    { value: 'Low', label: t('priority.low') },
                  ].map((p) => {
                    const isSelected = selectedPriority === p.value
                    return (
                      <button
                        key={p.value}
                        onClick={() => setSelectedPriority(p.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-sm font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 ml-auto">
                {loadingCards ? (
                  <span className="inline-flex items-center gap-1.5 text-sky-600 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('syncingFirestore')}
                  </span>
                ) : (
                  <>
                    <span>{t('dragAndDropHint')}</span>
                    <span>{t('showingTasksLabel')} <strong>{filteredCards.length}</strong> {t('tasksWord')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Tab Navigation (Horizontal tabs for phone screens) */}
            <div
              className="flex md:hidden items-center p-1 bg-slate-200/80 rounded-xl mb-4 gap-1 shadow-inner border border-slate-300/60"
              role="tablist"
              aria-label={t('mobileTablistAria')}
            >
              {columns.map((column) => {
                const isSelected = activeMobileTab === column.id
                const columnCards = filteredCards.filter((card) => card.columnId === column.id)
                const isOver = dragOverColId === column.id
                return (
                  <button
                    key={column.id}
                    type="button"
                    role="tab"
                    id={`tab-${column.id}`}
                    aria-selected={isSelected}
                    aria-controls={`panel-${column.id}`}
                    onClick={() => setActiveMobileTab(column.id)}
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDragLeave={(e) => handleDragLeave(e, column.id)}
                    onDrop={(e) => handleDrop(e, column.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                        : isOver
                        ? 'bg-sky-100 text-sky-900 border border-sky-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    <span className="truncate">{column.title}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${column.badgeBg}`}>
                      {columnCards.length}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Board Columns: To Do, In Progress, Done */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {columns.map((column) => {
                const columnCards = filteredCards.filter((card) => card.columnId === column.id)
                const isOver = dragOverColId === column.id
                const isSelectedOnMobile = activeMobileTab === column.id

                return (
                  <div
                    key={column.id}
                    id={`panel-${column.id}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${column.id}`}
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    onDragLeave={(e) => handleDragLeave(e, column.id)}
                    onDrop={(e) => handleDrop(e, column.id)}
                    className={`rounded-xl p-4 border transition-all duration-200 flex-col min-h-[550px] ${
                      isSelectedOnMobile ? 'flex' : 'hidden md:flex'
                    } ${
                      isOver
                        ? 'bg-sky-50 border-sky-400 shadow-md ring-2 ring-sky-300 ring-offset-2'
                        : 'bg-slate-100/90 border-slate-200/90 shadow-xs'
                    }`}
                  >
                    {/* Column Header */}
                    <div className={`flex items-center justify-between pb-3 mb-3 border-b-2 ${column.color}`}>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-slate-800 text-sm">{column.title}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${column.badgeBg}`}>
                          {columnCards.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleColumnCollapse(column.id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title={collapsedColumns[column.id] ? t('expandColumn', { name: column.title }) : t('collapseColumn', { name: column.title })}
                        aria-label={collapsedColumns[column.id] ? t('expandColumn', { name: column.title }) : t('collapseColumn', { name: column.title })}
                      >
                        {collapsedColumns[column.id] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Cards Container */}
                    {collapsedColumns[column.id] ? (
                      /* Collapsed / Stacked View */
                      <div className="flex-1 flex flex-col -space-y-1.5 py-1">
                        {columnCards.length === 0 ? (
                          <div
                            className={`flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg transition-colors ${
                              isOver ? 'border-sky-400 bg-sky-100/40 text-sky-700' : 'border-slate-200 text-slate-400'
                            }`}
                          >
                            <p className="text-xs">{t('task.emptyColumn')}</p>
                          </div>
                        ) : (
                          columnCards.map((card, idx) => {
                            const isDragging = draggedCardId === card.id
                            return (
                              <div
                                key={card.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, card.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => {
                                  const assignees = getCardAssignees(card)
                                  setEditingCard({
                                    ...card,
                                    assignees: assignees.length > 0 ? assignees : [],
                                  })
                                }}
                                style={{ zIndex: columnCards.length - idx }}
                                className={`bg-white rounded-lg px-3.5 py-2.5 shadow-xs hover:shadow-md transition-all border border-slate-200/90 hover:border-sky-400 cursor-pointer flex items-center justify-between group hover:z-30 hover:-translate-y-0.5 relative ${
                                  isDragging ? 'opacity-40 scale-[0.98] border-dashed border-sky-500' : ''
                                }`}
                                title={`${card.title} - ${t('editTask')}`}
                              >
                                <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-sky-700 transition-colors flex-1 min-w-0 truncate">
                                  {card.title}
                                </h3>
                              </div>
                            )
                          })
                        )}
                      </div>
                    ) : (
                      /* Expanded / Full View */
                      <div className="flex-1 flex flex-col gap-3">
                        {columnCards.length === 0 ? (
                          <div className={`flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-lg transition-colors ${
                            isOver ? 'border-sky-400 bg-sky-100/40 text-sky-700' : 'border-slate-200 text-slate-400'
                          }`}>
                            <p className="text-xs">{t('task.emptyColumn')}</p>
                          </div>
                        ) : (
                          columnCards.map((card) => {
                            const colOrder = ['todo', 'in_progress', 'done']
                            const currentIndex = colOrder.indexOf(card.columnId)
                            const canMoveLeft = currentIndex > 0
                            const canMoveRight = currentIndex < colOrder.length - 1
                            const isDragging = draggedCardId === card.id

                            return (
                              <div
                                key={card.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, card.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => {
                                  const assignees = getCardAssignees(card)
                                  setEditingCard({
                                    ...card,
                                    assignees: assignees.length > 0 ? assignees : [],
                                  })
                                }}
                                className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-slate-200 flex flex-col gap-3 cursor-pointer group hover:border-sky-300 ${
                                  isDragging ? 'opacity-40 scale-[0.98] border-dashed border-sky-500' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-sky-700 transition-colors flex-1 min-w-0">
                                    {card.title}
                                  </h3>
                                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded border shrink-0 ${getPriorityBadge(card.priority)}`}>
                                    {getPriorityDisplayLabel(card.priority)}
                                  </span>
                                </div>

                                {card.description && (
                                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed break-words whitespace-pre-line">
                                    {renderDescriptionWithLinks(card.description)}
                                  </p>
                                )}

                                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-500">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-1.5 flex-1 min-w-0" title={t('assignee.formLabel')}>
                                      <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                      <div className="flex flex-wrap gap-1">
                                        {getCardAssignees(card).length > 0 ? (
                                          getCardAssignees(card).map((person, idx) => (
                                            <span
                                              key={idx}
                                              className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] leading-tight"
                                            >
                                              {person}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="font-medium text-slate-400 italic text-[11px]">{t('assignee.unassigned')}</span>
                                        )}
                                      </div>
                                    </div>
                                    {card.dueDate ? (
                                      <div className="flex items-center gap-1 text-slate-400 shrink-0" title={t('task.dueDate')}>
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{card.dueDate}</span>
                                      </div>
                                    ) : null}
                                  </div>

                                  {/* Card Actions */}
                                  <div
                                    className="flex items-center justify-between pt-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setCardToDelete(card)
                                        }}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 cursor-pointer"
                                        title={t('deleteTask')}
                                        aria-label={t('deleteTask')}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1 ml-auto">
                                      {canMoveLeft && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            moveCard(card.id, 'prev')
                                          }}
                                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                          title="Flyt til forrige kolonne"
                                          aria-label="Flyt til forrige kolonne"
                                        >
                                          <ChevronLeft className="w-4 h-4" />
                                        </button>
                                      )}
                                      {canMoveRight && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            moveCard(card.id, 'next')
                                          }}
                                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                          title="Flyt til næste kolonne"
                                          aria-label="Flyt til næste kolonne"
                                        >
                                          <ChevronRight className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* Edit Card Modal */}
      {editingCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
          onClick={() => setEditingCard(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-slate-900">{t('editTask')}</h3>
              </div>
              <button
                onClick={() => setEditingCard(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm cursor-pointer"
                aria-label={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCard} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.title')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('task.titlePlaceholder')}
                  value={editingCard.title}
                  onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.description')}</label>
                <textarea
                  rows={4}
                  placeholder={t('task.descriptionPlaceholder')}
                  value={editingCard.description || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.status')}</label>
                  <select
                    value={editingCard.columnId}
                    onChange={(e) => setEditingCard({ ...editingCard, columnId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="todo">{t('columns.todo')}</option>
                    <option value="in_progress">{t('columns.in_progress')}</option>
                    <option value="done">{t('columns.done')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('priority.label')}</label>
                  <select
                    value={editingCard.priority}
                    onChange={(e) => setEditingCard({ ...editingCard, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Low">{t('priority.low')}</option>
                    <option value="Medium">{t('priority.medium')}</option>
                    <option value="High">{t('priority.high')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('assignee.formLabel')}
                </label>
                <AssigneeDropdown
                  boardMembers={boardMembers}
                  selectedAssignees={editingCard.assignees || getCardAssignees(editingCard)}
                  onChange={(updated) =>
                    setEditingCard({
                      ...editingCard,
                      assignees: updated,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.dueDate')}</label>
                <input
                  type="date"
                  value={editingCard.dueDate || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCardToDelete(editingCard)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('deleteTask')}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCard(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {t('saveChanges')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">{t('createTask')}</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm cursor-pointer"
                aria-label={t('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.title')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('task.titlePlaceholder')}
                  value={newCard.title}
                  onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.description')}</label>
                <textarea
                  rows={3}
                  placeholder={t('task.descriptionPlaceholder')}
                  value={newCard.description}
                  onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.status')}</label>
                  <select
                    value={newCard.columnId}
                    onChange={(e) => setNewCard({ ...newCard, columnId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="todo">{t('columns.todo')}</option>
                    <option value="in_progress">{t('columns.in_progress')}</option>
                    <option value="done">{t('columns.done')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('priority.label')}</label>
                  <select
                    value={newCard.priority}
                    onChange={(e) => setNewCard({ ...newCard, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Low">{t('priority.low')}</option>
                    <option value="Medium">{t('priority.medium')}</option>
                    <option value="High">{t('priority.high')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('assignee.formLabel')}
                </label>
                <AssigneeDropdown
                  boardMembers={boardMembers}
                  selectedAssignees={newCard.assignees || []}
                  onChange={(updated) =>
                    setNewCard({
                      ...newCard,
                      assignees: updated,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.dueDate')}</label>
                <input
                  type="date"
                  value={newCard.dueDate}
                  onChange={(e) => setNewCard({ ...newCard, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm cursor-pointer"
                >
                  {t('addTask')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {cardToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
          onClick={() => setCardToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-full shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-lg font-bold text-slate-900">
                  {t('deleteDialog.title')}
                </h3>
                <p className="text-xs text-slate-500">{t('deleteDialog.warning')}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {t('deleteDialog.confirmQuestion', { title: cardToDelete.title })}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCardToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const idToDelete = cardToDelete.id
                  setCardToDelete(null)
                  await deleteCard(idToDelete)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm cursor-pointer transition-colors"
              >
                {t('deleteTask')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>Foreningens Bestyrelsesportal &bull; Scrumboard til effektiv opgavestyring</p>
      </footer>
    </div>
  )
}

export default function App({ initialLanguage } = {}) {
  return (
    <I18nProvider initialLanguage={initialLanguage}>
      <BoardApp />
    </I18nProvider>
  )
}
