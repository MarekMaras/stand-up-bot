import React from 'react'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { Redirect } from 'react-router-dom'
import { useQuery } from 'react-apollo'

import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import CircleLoader from 'react-spinners/CircleLoader'

import {
  GET_ALL_QUERIES,
  GET_PAIRS,
  GET_LAST_PUBLISHED_SESSION,
} from './graphql/queries'
import {
  NEW_SHARE,
  NEW_HELP,
  NEW_PAIR,
  NEW_SESSION,
} from './graphql/subscriptions'

export const StoreContext = React.createContext(null)

dayjs.extend(utc)

const today = dayjs()
  .utc()
  .toISOString()
const yesterday = dayjs()
  .utc()
  .subtract(2, 'day')
  .toISOString()

const StoreProvider = ({
  lastPublishedAt,
  authToken,
  children,
  setAuthToken,
}) => {
  const [activeSession, setActiveSession] = React.useState(null)
  const [help, setHelp] = React.useState([])
  const [pairing, setPairing] = React.useState([])
  const [sharing, setSharing] = React.useState([])
  const [pollsData, setPollsData] = React.useState(null)
  const [vimMode, setVimMode] = React.useState(false)
  const savedName = localStorage.getItem('name')
  const [name, setName] = React.useState(savedName)

  const parselastpublish = dayjs(lastPublishedAt)
    .utc()
    .toISOString()

  const allQueries = useQuery(GET_ALL_QUERIES, {
    variables: { last_published: parselastpublish },
  })
  const allPairs = useQuery(GET_PAIRS, {
    variables: { yesterday },
  })

  React.useEffect(() => {
    const subscribeToMore = (state, document, attr) => {
      state.subscribeToMore({
        document,
        variables:
          attr !== 'sessions' &&
          (attr === 'pairs'
            ? { yesterday }
            : { lastPublishedAt: parselastpublish }),
        updateQuery: (prev, { subscriptionData }) => {
          return Object.assign({}, prev, {
            [attr]: subscriptionData.data[attr],
          })
        },
      })
    }

    if (allQueries.data && allQueries.data.shares) {
      const reformatedData = allQueries.data.shares.map(d => {
        return { ...d, value: d.sharing }
      })
      setSharing(reformatedData)
      subscribeToMore(allQueries, NEW_SHARE, 'shares')
    }
    if (allQueries.data && allQueries.data.assistance) {
      const reformatedData = allQueries.data.assistance.map(d => {
        return { ...d, value: d.assist }
      })
      setHelp(reformatedData)
      subscribeToMore(allQueries, NEW_HELP, 'assistance')
    }
    if (allPairs.data && allPairs.data.pairs) {
      const reformatedData = allPairs.data.pairs.map(d => {
        return { ...d, value: d.project }
      })
      setPairing(reformatedData)
      subscribeToMore(allPairs, NEW_PAIR, 'pairs')
    }
    if (allQueries.data && allQueries.data.sessions) {
      setActiveSession(allQueries.data.sessions)
      subscribeToMore(allQueries, NEW_SESSION, 'sessions')
    }
  }, [allPairs, allPairs.data, allQueries, allQueries.data, parselastpublish])

  const SpinnerWrapper = styled(motion.div)`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  `

  const store = {
    activeSession,
    authToken,
    help: [help, setHelp],
    name,
    pairing: [pairing, setPairing],
    pollsData,
    setActiveSession,
    setAuthToken,
    setName,
    setPollsData,
    setVimMode,
    sharing: [sharing, setSharing],
    vimMode,
  }

  // return null
  return (
    <AnimatePresence>
      {allQueries.loading ? (
        <SpinnerWrapper
          key="spinner"
          initial={{ scale: 0 }}
          animate={{ rotate: 180, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
          exit={{ scale: 0, opacity: 0 }}
        >
          <CircleLoader color={'#36D7B7'} />
        </SpinnerWrapper>
      ) : allQueries.error ? (
        <Redirect to="/login" />
      ) : (
        <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
      )}
    </AnimatePresence>
  )
}

const StoreWrapper = props => {
  const lastSession = useQuery(GET_LAST_PUBLISHED_SESSION)
  if (lastSession.loading) return null
  return (
    <StoreProvider
      {...props}
      lastPublishedAt={lastSession.data.sessions[0].published_at}
    />
  )
}

export default StoreWrapper
