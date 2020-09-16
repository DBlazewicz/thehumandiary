$(document).ready(function() {
  addListeners();
})

function addListeners() {
  let deleteButtons = document.querySelectorAll(".delete-btn")

  deleteButtons.forEach(function(button) {
    button.addEventListener("click", function(e){
      e.preventDefault();
      deleteEntry($(this))
    })
  })
}

function deleteEntry(button) {
  Swal.fire({
  title: 'Are you sure?',
  text: "You won't be able to revert this!",
  // icon: 'warning',
  showCancelButton: true,
  // // confirmButtonColor: '#3085d6',
  // // cancelButtonColor: '#d33',
  confirmButtonText: 'Yes, delete it!',
  scrollbarPadding: false
  // background: '#204051',
  }).then((result) => {
    if (result.isConfirmed) {

      button.closest("form").submit();

    } else {
      return false;
    }
  })
}
