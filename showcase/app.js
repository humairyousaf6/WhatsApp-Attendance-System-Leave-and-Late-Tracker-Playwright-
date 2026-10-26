const status = document.getElementById('demoStatus')

document.querySelectorAll('button').forEach((button) => {
  button.addEventListener('click', () => {
    status.textContent = `${button.textContent.trim()} — interaction disabled in this sanitized public preview.`
  })
})
