const API_URL =
"https://script.google.com/a/macros/jkfoundries.com/s/AKfycbyy9RXEOafUAVQRML2kpyRhxzBL6JHlEXijAhNcyxZe9eK0ehazbpc_a76pkOL9wkjF/exec?api=orders";

export async function getOrders() {
  const response = await fetch(API_URL);
  const data = await response.json();

  return data;
}