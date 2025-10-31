import axios from "axios"

const http = axios.create({
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})

export default http