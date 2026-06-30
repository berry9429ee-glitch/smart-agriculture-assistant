import { createStore } from 'vuex'

const store = createStore({
  state: {
    monitorData: {
      temperature: 0,
      humidity: 0,
      ph: 0,
      light: 0,
      status: '获取中',
      alert: ''
    }
  },
  mutations: {
    setMonitorData(state, data) {
      state.monitorData = data
    }
  },
  getters: {
    monitorData: state => state.monitorData
  }
})

export default store
