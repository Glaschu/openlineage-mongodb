import { HEADER_HEIGHT } from '../../helpers/theme'
import { Nullable } from '../../types/util/Nullable'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'

export interface ILineageState {
  selectedNode: Nullable<string>
  bottomBarHeight: number
  depth: number
  tabIndex: number
  showFullGraph: boolean
}

const initialState: ILineageState = {
  selectedNode: null,
  bottomBarHeight: (window.innerHeight - HEADER_HEIGHT) / 3,
  depth: 5,
  tabIndex: 0,
  showFullGraph: true,
}

const DRAG_BAR_HEIGHT = 8

const lineageSlice = createSlice({
  name: 'lineage',
  initialState,
  reducers: {
    setSelectedNode: (state, action: PayloadAction<Nullable<string>>) => {
      state.selectedNode = action.payload
      // reset the selected index if we are not on the i/o tab
      if (state.tabIndex !== 1) {
        state.tabIndex = 0
      }
    },
    setBottomBarHeight: (state, action: PayloadAction<number>) => {
      state.bottomBarHeight = Math.min(
        window.innerHeight - HEADER_HEIGHT - DRAG_BAR_HEIGHT,
        Math.max(2, action.payload)
      )
    },
    setTabIndex: (state, action: PayloadAction<number>) => {
      state.tabIndex = action.payload
    },
    setLineageGraphDepth: (state, action: PayloadAction<number>) => {
      state.depth = action.payload
    },
    setShowFullGraph: (state, action: PayloadAction<boolean>) => {
      state.showFullGraph = action.payload
    },
    resetLineage: () => initialState,
  },
})

export const {
  setSelectedNode,
  setBottomBarHeight,
  setTabIndex,
  setLineageGraphDepth,
  setShowFullGraph,
  resetLineage,
} = lineageSlice.actions

export default lineageSlice.reducer
