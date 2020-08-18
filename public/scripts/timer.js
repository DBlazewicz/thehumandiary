$(document).ready(function() {
  move();
})

function move() {
  var elem = document.getElementById("myBar");
  var width = 0;
  const goalTime = 300000; //5 minutes

  var id = setInterval(frame, 10);
  function frame() {
    if (width === goalTime) {
      clearInterval(id);
      swal({
        title: "Good job!",
        text: "You've been reflecting for 5 minutes! Time to wrap up your last thoughts and have a great day.",
        button: "Continue"
      });
    } else {
      width = width + 10;
      elem.style.width = (width/goalTime) *100 + '%';
    }
  }
}
