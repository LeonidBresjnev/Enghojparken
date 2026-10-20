import { useState, useEffect, useMemo, useRef } from 'react'
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
import { isUserAllowed, getAllowedUserNames } from './allowedUsers'
import AuthModal from './AuthModal'
import { I18nProvider, useTranslation } from './i18n'
import Header from './components/Header'
import TaskColumn from './components/TaskColumn'
import TaskFormModal from './components/TaskFormModal'
import DeleteTaskDialog from './components/DeleteTaskDialog'
import { getCardAssignees, normalizePriority } from './utils/cardUtils'
import {
  User as UserIcon,
  LogIn,
  Loader2,
  AlertTriangle,
  Users,
  Lock,
  ShieldCheck
} from 'lucide-react'


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
  const boardColumnsRef = useRef(null)

  const columns = useMemo(() => [
    { id: 'todo', title: t('columns.todo'), color: 'border-amber-400', badgeBg: 'bg-amber-100 text-amber-800' },
    { id: 'in_progress', title: t('columns.in_progress'), color: 'border-blue-500', badgeBg: 'bg-blue-100 text-blue-800' },
    { id: 'done', title: t('columns.done'), color: 'border-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800' },
  ], [t])

  const scrollToColumn = (columnId) => {
    setActiveMobileTab(columnId)
    const el = document.getElementById(`panel-${columnId}`)
    if (el) {
      el.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }

  const handleContainerScroll = () => {
    const container = boardColumnsRef.current
    if (!container) return
    const panels = columns.map((c) => document.getElementById(`panel-${c.id}`)).filter(Boolean)
    if (!panels.length) return

    const containerRect = container.getBoundingClientRect()
    const containerCenter = containerRect.left + containerRect.width / 2

    let closestColId = columns[0].id
    let minDistance = Infinity

    panels.forEach((panel, idx) => {
      const rect = panel.getBoundingClientRect()
      const panelCenter = rect.left + rect.width / 2
      const dist = Math.abs(containerCenter - panelCenter)
      if (dist < minDistance) {
        minDistance = dist
        closestColId = columns[idx].id
      }
    })

    if (closestColId && closestColId !== activeMobileTab) {
      setActiveMobileTab(closestColId)
    }
  }

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

  const handleOpenCreateModal = () => {
    setNewCard({
      title: '',
      description: '',
      columnId: 'todo',
      assignees: [],
      priority: 'Medium',
      dueDate: '',
    })
    setIsCreateModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white flex flex-col font-sans">
      <Header
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenCreateModal={handleOpenCreateModal}
      />

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
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 max-w-full">
                {/* Person filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  <UserIcon className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                    {t('assignee.label')}
                  </span>
                  <button
                    onClick={() => setSelectedAssignee('All')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
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
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
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
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
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
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
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
              className="flex md:hidden items-center p-1 bg-white/90 backdrop-blur-sm rounded-xl mb-4 gap-1 shadow-sm border border-slate-200"
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
                    onClick={() => scrollToColumn(column.id)}
                    onDragOver={(e) => {
                      handleDragOver(e, column.id)
                      if (activeMobileTab !== column.id) {
                        scrollToColumn(column.id)
                      }
                    }}
                    onDragLeave={(e) => handleDragLeave(e, column.id)}
                    onDrop={(e) => handleDrop(e, column.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
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
            <div
              ref={boardColumnsRef}
              onScroll={handleContainerScroll}
              className="flex overflow-x-auto snap-x snap-mandatory gap-3 sm:gap-4 pb-4 px-1 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0 md:px-0 scroll-smooth items-start -mx-2 sm:mx-0"
            >
              {columns.map((column) => {
                const columnCards = filteredCards.filter((card) => card.columnId === column.id)
                const isOver = dragOverColId === column.id
                const isSelectedOnMobile = activeMobileTab === column.id

                return (
                  <TaskColumn
                    key={column.id}
                    column={column}
                    cards={columnCards}
                    isOver={isOver}
                    isSelectedOnMobile={isSelectedOnMobile}
                    isCollapsed={collapsedColumns[column.id]}
                    draggedCardId={draggedCardId}
                    onToggleCollapse={() => toggleColumnCollapse(column.id)}
                    onDragOver={(e) => {
                      handleDragOver(e, column.id)
                      if (activeMobileTab !== column.id) {
                        setActiveMobileTab(column.id)
                      }
                    }}
                    onDragLeave={(e) => handleDragLeave(e, column.id)}
                    onDrop={(e) => handleDrop(e, column.id)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onCardClick={(card) => {
                      const assignees = getCardAssignees(card)
                      setEditingCard({
                        ...card,
                        assignees: assignees.length > 0 ? assignees : [],
                      })
                    }}
                    onDeleteCard={setCardToDelete}
                    onMoveCard={moveCard}
                  />
                )
              })}
            </div>
          </>
        )}
      </main>

      {editingCard && (
        <TaskFormModal
          mode="edit"
          task={editingCard}
          boardMembers={boardMembers}
          onChange={setEditingCard}
          onSubmit={handleUpdateCard}
          onClose={() => setEditingCard(null)}
          onDelete={() => setCardToDelete(editingCard)}
        />
      )}

      {isCreateModalOpen && (
        <TaskFormModal
          mode="create"
          task={newCard}
          boardMembers={boardMembers}
          onChange={setNewCard}
          onSubmit={handleCreateCard}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {cardToDelete && (
        <DeleteTaskDialog
          card={cardToDelete}
          onCancel={() => setCardToDelete(null)}
          onConfirm={(card) => {
            setCardToDelete(null)
            return deleteCard(card.id)
          }}
        />
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
