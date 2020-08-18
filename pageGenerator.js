exports.newPage = function(date) {
  const url = "https://favqs.com/api/qotd";
  var newPrompt = new Prompt({
    author:'',
    quote: ''
  })

  https.get(url, function(response) {
    response.on("data", function(data) {
      const quoteData = JSON.parse(data);
      const author = quoteData.quote.author;
      const quote = quoteData.quote.body;

      newPrompt.author=author;
      newPrompt.quote=quote;
    })
  })

  let newPage = new Page({
    dateId: date.id,
    title: date.title,
    prompt: newPrompt,
    entries: []
  });

  newPage.save();
}
