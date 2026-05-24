async function getCode() {

    const number =
        document.getElementById("number").value;

    const result =
        document.getElementById("result");

    if (!number) {
        result.innerHTML = "Enter phone number";
        return;
    }

    result.innerHTML = "Generating...";

    try {

        const response =
            await fetch(`/pair?number=${number}`);

        const data = await response.json();

        if (data.status) {

            result.innerHTML =
                `PAIR CODE: ${data.code}`;

        } else {

            result.innerHTML =
                data.message;

        }

    } catch (err) {

        result.innerHTML =
            "Server error";

    }
}
