
client.global.set("email", response.body.form.email);
client.test("Request executed successfully", function() {
    client.assert(response.status === 200, "Response status is not 200");
});