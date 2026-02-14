const button = document.getElementById("showHeart");
const heartWrap = document.getElementById("heartWrap");

button.addEventListener("click", () => {
  heartWrap.classList.toggle("is-visible");
  heartWrap.setAttribute("aria-hidden", String(!heartWrap.classList.contains("is-visible")));
  button.textContent = heartWrap.classList.contains("is-visible")
    ? "Спрятать"
    : "Нажать";
});
