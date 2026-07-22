function showHomePage(req, res) {
    res.render("home", {
        title: "RailReserve"
    });
}
module.exports = {
    showHomePage
};
