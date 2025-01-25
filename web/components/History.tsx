import { observer } from 'mobx-react-lite'
import { action, computed, observable, reaction } from 'mobx'
import { createId } from '@paralleldrive/cuid2'

import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import ShareIcon from '@mui/icons-material/Send'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import Typography from '@mui/material/Typography'
import dayjs from 'dayjs'

export interface ShareType {
  type: 'received' | 'shared'
  code: string
  date: number
  id: string
  file: boolean
}

class HistoryState {
  static key = 'history'

  @observable.shallow accessor list: Array<ShareType>

  @computed
  get isEmpty() {
    return !this.list.length
  }

  constructor() {
    this.list = this.load()
    reaction(() => this.list, this.save)
  }

  private load(): Array<ShareType> {
    const data = localStorage.getItem(HistoryState.key)
    if (!data) return []
    try {
      return JSON.parse(data)
    } catch (_e) {
      return []
    }
  }

  private save = (data: Array<ShareType>) => {
    localStorage.setItem(HistoryState.key, JSON.stringify(data))
  }

  @action
  private insert(share: Omit<ShareType, 'id' | 'date'>) {
    const list = [...this.list]
    const index = list.findIndex(
      (d) => d.code === share.code && d.type === share.type,
    )
    if (index >= 0) {
      list.splice(index, 1)
    }
    this.list = [
      { ...share, id: createId(), date: new Date().getTime() },
      ...list,
    ]
  }

  insertReceived(code: string, file: boolean) {
    this.insert({
      type: 'received',
      code,
      file,
    })
  }

  insertShared(code: string, file: boolean) {
    this.insert({
      type: 'shared',
      code,
      file,
    })
  }

  @action
  remove(id: string) {
    if (!id) return
    this.list = this.list.filter((d) => d.id !== id)
  }
}

const state = new HistoryState()

export const historyApi = {
  insertReceived(code: string, file = false) {
    return state.insertReceived(code, file)
  },
  insertShared(code: string, file = false) {
    return state.insertShared(code, file)
  },
  remove(id: string) {
    return state.remove(id)
  },
}

interface HistoryProps {
  onItemClick?: (share: ShareType) => void
}

export const History = observer(({ onItemClick }: HistoryProps) => {
  if (state.isEmpty) return null

  const handleDelete = (e: MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    historyApi.remove(id)
  }

  const handleView = (item: ShareType) => {
    if (onItemClick) {
      onItemClick(item)
    }
  }

  return (
    <Box>
      <List dense>
        {state.list.map((item) => (
          <ListItem
            className="items-start"
            key={item.id}
            onClick={() => handleView(item)}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="delete"
                sx={{ p: 0.5 }}
                onClick={(e) => handleDelete(e, item.id)}
              >
                <DeleteIcon />
              </IconButton>
            }
            sx={{
              cursor: 'pointer',
              pr: '32px',
              '.MuiListItemSecondaryAction-root': {
                top: -2,
                transform: 'none',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 24 }}>
              {item.type === 'shared' && <ShareIcon fontSize="small" />}
              {item.type === 'received' && <DownloadIcon fontSize="medium" />}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography>
                  {item.type === 'shared' ? '分享' : '接收'}了
                  {item.file ? '檔案' : '文字'}，分享碼 {item.code}，點擊檢視
                </Typography>
              }
              secondary={
                <Typography color="textDisabled" variant="caption">
                  {dayjs(item.date).fromNow()}
                </Typography>
              }
              sx={{
                m: 0,
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
})
