exports.getDateAsObject = function() {
  const date = new Date();

  const id = getDateAsId(date);
  const title = getDateAsTitle(date);

  return  {
    id: id,
    title: title
  }
}

function getDateAsId(date) {
  return (date.getFullYear().toString() + "-" + appendLeadingZeros((date.getMonth() + 1).toString())
   + "-" + appendLeadingZeros(date.getDate().toString()));
}

function getDateAsTitle(date) {
  const options = {
    month:"short",
    day:"numeric",
    weekday:"long"
  };

  const day = date.toLocaleString("en-US", options);
  return day;
}

function appendLeadingZeros(n) {
  if(n <= 9) {
    return ("0" + n);
  } else {
    return n;
  }
}

exports.compareDateIds = function(entryOne, entryTwo) {
  const dateOne = entryOne.dateId;
  const dateTwo = entryTwo.dateId;

  const yearOne = Number(dateOne.slice(0,4));
  const monthOne = Number(dateOne.slice(5,7));
  const dayOne = Number(dateOne.slice(8,10));

  const yearTwo = Number(dateTwo.slice(0,4));
  const monthTwo = Number(dateTwo.slice(5,7));
  const dayTwo = Number(dateTwo.slice(8,10));

  if((yearOne - yearTwo) != 0) {
    return -(yearOne - yearTwo);
  } else if ((monthOne - monthTwo) != 0) {
    return -(monthOne - monthTwo);
  } else {
    return -(dayOne - dayTwo);
  }
}

// exports.getDay = function() {
//   const options = {
//     weekday:"long"
//   };
//
//   const day = (new Date()).toLocaleString("en-US", options);
//   return day;
// }
