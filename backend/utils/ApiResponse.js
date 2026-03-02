export class ApiResponse {
  constructor({ success = true, message = "ok", data = null }) {
    this.success = success;
    this.message = message;
    this.data = data;
  }
}