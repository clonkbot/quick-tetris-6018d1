import { useState, useEffect, useCallback, useRef } from 'react'

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const CELL_SIZE = 28

type Cell = string | null
type Board = Cell[][]

interface Position {
  x: number
  y: number
}

interface Piece {
  shape: number[][]
  color: string
  position: Position
}

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f5ff' },
  O: { shape: [[1, 1], [1, 1]], color: '#ffd700' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },
}

type TetrominoKey = keyof typeof TETROMINOS

const createEmptyBoard = (): Board => {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null)
  )
}

const getRandomTetromino = (): Piece => {
  const keys = Object.keys(TETROMINOS) as TetrominoKey[]
  const randomKey = keys[Math.floor(Math.random() * keys.length)]
  const tetromino = TETROMINOS[randomKey]
  return {
    shape: tetromino.shape.map(row => [...row]),
    color: tetromino.color,
    position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2), y: 0 },
  }
}

const rotate = (shape: number[][]): number[][] => {
  const rows = shape.length
  const cols = shape[0].length
  const rotated: number[][] = []
  for (let i = 0; i < cols; i++) {
    rotated.push([])
    for (let j = rows - 1; j >= 0; j--) {
      rotated[i].push(shape[j][i])
    }
  }
  return rotated
}

const isValidMove = (board: Board, piece: Piece, offsetX: number, offsetY: number, newShape?: number[][]): boolean => {
  const shape = newShape || piece.shape
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const newX = piece.position.x + x + offsetX
        const newY = piece.position.y + y + offsetY
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return false
        }
        if (newY >= 0 && board[newY][newX]) {
          return false
        }
      }
    }
  }
  return true
}

const mergePieceToBoard = (board: Board, piece: Piece): Board => {
  const newBoard = board.map(row => [...row])
  piece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        const boardY = piece.position.y + y
        const boardX = piece.position.x + x
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          newBoard[boardY][boardX] = piece.color
        }
      }
    })
  })
  return newBoard
}

const clearLines = (board: Board): { newBoard: Board; linesCleared: number } => {
  const newBoard = board.filter(row => row.some(cell => !cell))
  const linesCleared = BOARD_HEIGHT - newBoard.length
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(null))
  }
  return { newBoard, linesCleared }
}

const getGhostPosition = (board: Board, piece: Piece): number => {
  let ghostY = 0
  while (isValidMove(board, piece, 0, ghostY + 1)) {
    ghostY++
  }
  return ghostY
}

function App() {
  const [board, setBoard] = useState<Board>(createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [nextPiece, setNextPiece] = useState<Piece | null>(null)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const gameLoopRef = useRef<number | null>(null)

  const startGame = useCallback(() => {
    setBoard(createEmptyBoard())
    setCurrentPiece(getRandomTetromino())
    setNextPiece(getRandomTetromino())
    setScore(0)
    setLevel(1)
    setLines(0)
    setGameOver(false)
    setIsPaused(false)
    setIsPlaying(true)
  }, [])

  const moveDown = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return

    if (isValidMove(board, currentPiece, 0, 1)) {
      setCurrentPiece(prev => prev ? { ...prev, position: { ...prev.position, y: prev.position.y + 1 } } : null)
    } else {
      const newBoard = mergePieceToBoard(board, currentPiece)
      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)
      
      setBoard(clearedBoard)
      setLines(prev => {
        const newLines = prev + linesCleared
        setLevel(Math.floor(newLines / 10) + 1)
        return newLines
      })
      setScore(prev => prev + linesCleared * linesCleared * 100 * level)

      if (nextPiece && !isValidMove(clearedBoard, nextPiece, 0, 0)) {
        setGameOver(true)
        setIsPlaying(false)
        return
      }

      setCurrentPiece(nextPiece)
      setNextPiece(getRandomTetromino())
    }
  }, [board, currentPiece, nextPiece, gameOver, isPaused, level])

  const moveLeft = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    if (isValidMove(board, currentPiece, -1, 0)) {
      setCurrentPiece(prev => prev ? { ...prev, position: { ...prev.position, x: prev.position.x - 1 } } : null)
    }
  }, [board, currentPiece, gameOver, isPaused])

  const moveRight = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    if (isValidMove(board, currentPiece, 1, 0)) {
      setCurrentPiece(prev => prev ? { ...prev, position: { ...prev.position, x: prev.position.x + 1 } } : null)
    }
  }, [board, currentPiece, gameOver, isPaused])

  const rotatePiece = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    const rotated = rotate(currentPiece.shape)
    if (isValidMove(board, currentPiece, 0, 0, rotated)) {
      setCurrentPiece(prev => prev ? { ...prev, shape: rotated } : null)
    } else if (isValidMove(board, currentPiece, -1, 0, rotated)) {
      setCurrentPiece(prev => prev ? { ...prev, shape: rotated, position: { ...prev.position, x: prev.position.x - 1 } } : null)
    } else if (isValidMove(board, currentPiece, 1, 0, rotated)) {
      setCurrentPiece(prev => prev ? { ...prev, shape: rotated, position: { ...prev.position, x: prev.position.x + 1 } } : null)
    }
  }, [board, currentPiece, gameOver, isPaused])

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    const ghostY = getGhostPosition(board, currentPiece)
    setCurrentPiece(prev => prev ? { ...prev, position: { ...prev.position, y: prev.position.y + ghostY } } : null)
    setTimeout(moveDown, 0)
  }, [board, currentPiece, gameOver, isPaused, moveDown])

  const togglePause = useCallback(() => {
    if (!isPlaying || gameOver) return
    setIsPaused(prev => !prev)
  }, [isPlaying, gameOver])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        e.preventDefault()
        moveLeft()
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        e.preventDefault()
        moveRight()
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault()
        moveDown()
      } else if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault()
        rotatePiece()
      } else if (e.key === ' ') {
        e.preventDefault()
        hardDrop()
      } else if (e.key === 'p' || e.key === 'Escape') {
        e.preventDefault()
        togglePause()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveLeft, moveRight, moveDown, rotatePiece, hardDrop, togglePause])

  useEffect(() => {
    if (!isPlaying || gameOver || isPaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }
      return
    }

    const speed = Math.max(100, 800 - (level - 1) * 80)
    gameLoopRef.current = window.setInterval(moveDown, speed)

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [isPlaying, gameOver, isPaused, level, moveDown])

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row])
    
    if (currentPiece) {
      const ghostY = getGhostPosition(board, currentPiece)
      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell) {
            const ghostBoardY = currentPiece.position.y + y + ghostY
            const ghostBoardX = currentPiece.position.x + x
            if (ghostBoardY >= 0 && ghostBoardY < BOARD_HEIGHT && ghostBoardX >= 0 && ghostBoardX < BOARD_WIDTH) {
              if (!displayBoard[ghostBoardY][ghostBoardX]) {
                displayBoard[ghostBoardY][ghostBoardX] = currentPiece.color + '40'
              }
            }
          }
        })
      })

      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell) {
            const boardY = currentPiece.position.y + y
            const boardX = currentPiece.position.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.color
            }
          }
        })
      })
    }

    return displayBoard
  }

  const renderNextPiece = () => {
    if (!nextPiece) return null
    return (
      <div className="flex flex-col items-center">
        {nextPiece.shape.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => (
              <div
                key={x}
                className="border border-gray-700"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: cell ? nextPiece.color : 'transparent',
                  boxShadow: cell ? `inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.3)` : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  const displayBoard = renderBoard()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="flex flex-col lg:flex-row gap-6 items-center">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-4">
            TETRIS
          </h1>
          
          <div
            className="relative border-4 border-purple-500 rounded-lg overflow-hidden shadow-2xl shadow-purple-500/30"
            style={{
              width: BOARD_WIDTH * CELL_SIZE + 8,
              height: BOARD_HEIGHT * CELL_SIZE + 8,
              background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
            }}
          >
            <div className="p-1">
              {displayBoard.map((row, y) => (
                <div key={y} className="flex">
                  {row.map((cell, x) => (
                    <div
                      key={x}
                      className="border border-gray-800/50"
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: cell || 'transparent',
                        boxShadow: cell && !cell.includes('40')
                          ? `inset 3px 3px 6px rgba(255,255,255,0.3), inset -3px -3px 6px rgba(0,0,0,0.4)`
                          : 'none',
                        opacity: cell?.includes('40') ? 0.3 : 1,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {(gameOver || isPaused || !isPlaying) && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                {gameOver && (
                  <>
                    <p className="text-3xl font-bold text-red-500 mb-2">GAME OVER</p>
                    <p className="text-xl text-white mb-4">Score: {score}</p>
                  </>
                )}
                {isPaused && (
                  <p className="text-3xl font-bold text-yellow-400 mb-4">PAUSED</p>
                )}
                {!isPlaying && !gameOver && (
                  <p className="text-2xl text-gray-300 mb-4">Press Start to Play</p>
                )}
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-purple-400 transition-all transform hover:scale-105 shadow-lg"
                >
                  {gameOver ? 'Play Again' : (isPaused ? 'Resume' : 'Start Game')}
                </button>
                {isPaused && (
                  <button
                    onClick={togglePause}
                    className="mt-2 px-6 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all"
                  >
                    Continue
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 w-48">
          <div className="bg-gray-800/80 rounded-lg p-4 border border-purple-500/50">
            <h2 className="text-lg font-bold text-purple-400 mb-2">Next</h2>
            <div className="flex justify-center h-20 items-center">
              {renderNextPiece()}
            </div>
          </div>

          <div className="bg-gray-800/80 rounded-lg p-4 border border-purple-500/50">
            <div className="mb-3">
              <p className="text-sm text-gray-400">Score</p>
              <p className="text-2xl font-bold text-cyan-400">{score}</p>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-400">Level</p>
              <p className="text-2xl font-bold text-purple-400">{level}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Lines</p>
              <p className="text-2xl font-bold text-green-400">{lines}</p>
            </div>
          </div>

          <div className="bg-gray-800/80 rounded-lg p-4 border border-purple-500/50">
            <h2 className="text-lg font-bold text-purple-400 mb-2">Controls</h2>
            <div className="text-sm text-gray-300 space-y-1">
              <p>← → : Move</p>
              <p>↑ : Rotate</p>
              <p>↓ : Soft Drop</p>
              <p>Space : Hard Drop</p>
              <p>P / Esc : Pause</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={startGame}
              className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:from-green-400 hover:to-emerald-400 transition-all"
            >
              New Game
            </button>
            {isPlaying && !gameOver && (
              <button
                onClick={togglePause}
                className="w-full px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
          </div>

          <div className="lg:hidden flex justify-center gap-2 mt-4">
            <button
              onTouchStart={moveLeft}
              onClick={moveLeft}
              className="w-14 h-14 bg-gray-700 rounded-lg text-white text-2xl font-bold active:bg-gray-600"
            >
              ←
            </button>
            <div className="flex flex-col gap-2">
              <button
                onTouchStart={rotatePiece}
                onClick={rotatePiece}
                className="w-14 h-14 bg-gray-700 rounded-lg text-white text-2xl font-bold active:bg-gray-600"
              >
                ↻
              </button>
              <button
                onTouchStart={moveDown}
                onClick={moveDown}
                className="w-14 h-14 bg-gray-700 rounded-lg text-white text-2xl font-bold active:bg-gray-600"
              >
                ↓
              </button>
            </div>
            <button
              onTouchStart={moveRight}
              onClick={moveRight}
              className="w-14 h-14 bg-gray-700 rounded-lg text-white text-2xl font-bold active:bg-gray-600"
            >
              →
            </button>
            <button
              onTouchStart={hardDrop}
              onClick={hardDrop}
              className="w-14 h-14 bg-purple-600 rounded-lg text-white text-lg font-bold active:bg-purple-500"
            >
              Drop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App