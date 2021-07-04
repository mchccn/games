import * as readline from "readline";

const rl = readline.createInterface(process.stdin, process.stdout);

const boardSize = parseInt(process.argv[2]) || 10;

const board = new Array(boardSize).fill(undefined).map((_, i) => new Array(boardSize).fill(0));

const toAscii = [".", "#", "@"];

const player: {
    dir: string;
    body: { x: number; y: number }[];
} = {
    dir: "d",
    body: [
        {
            x: -1,
            y: 0,
        },
    ],
};

const food = {
    x: Math.floor(Math.random() * (boardSize - 2)) + 1,
    y: Math.floor(Math.random() * (boardSize - 2)) + 1,
};

function loop() {
    console.clear();

    const [{ x, y }] = player.body;

    player.body.pop();

    const dir = rl.line[rl.line.length - 1];

    if (
        ["w", "a", "s", "d"].includes(dir) &&
        (player.dir !== "d" || dir !== "a") &&
        (player.dir !== "a" || dir !== "d") &&
        (player.dir !== "w" || dir !== "s") &&
        (player.dir !== "s" || dir !== "w")
    )
        player.dir = dir;

    switch (player.dir) {
        case "d":
            player.body.unshift({
                x: x + 1,
                y,
            });
            break;
        case "a":
            player.body.unshift({
                x: x - 1,
                y,
            });
            break;
        case "s":
            player.body.unshift({
                x,
                y: y + 1,
            });
            break;
        case "w":
            player.body.unshift({
                x,
                y: y - 1,
            });
            break;
        default:
            throw new Error(`Impossible direction '${player.dir}'.`);
    }

    const [head, ...body] = player.body;

    if (head.x > boardSize - 1 || head.x < 0 || head.y > boardSize - 1 || head.y < 0 || body.some(({ x, y }) => head.x === x && head.y === y)) {
        board.splice(
            0,
            boardSize,
            ...new Array(boardSize)
                .fill(undefined)
                .map((_, i) => new Array(boardSize).fill(0))
                .slice(0, boardSize - 1)
        );

        board[Math.floor(boardSize / 2) - 1] = (
            "0".repeat(Math.max(Math.floor((boardSize - 8) / 2), 0)) +
            "YOU DIED" +
            "0".repeat(Math.max(Math.ceil((boardSize - 8) / 2), 0))
        ).split("");

        printBoard(board);

        console.log("score: ", player.body.length);

        return process.exit();
    }

    if (head.x === food.x && head.y === food.y) {
        let i = 0;
        while (player.body.some(({ x, y }) => x == food.x && y === food.y) && i < boardSize) {
            food.x = Math.floor(Math.random() * (boardSize - 2)) + 1;
            food.y = Math.floor(Math.random() * (boardSize - 2)) + 1;
            i++;
        }

        player.body.push(player.body[player.body.length - 1]);

        if (player.body.length >= boardSize * boardSize) {
            board.splice(
                0,
                boardSize,
                ...new Array(boardSize)
                    .fill(undefined)
                    .map((_, i) => new Array(boardSize).fill(0))
                    .slice(0, boardSize - 1)
            );

            board[Math.floor(boardSize / 2) - 1] = (
                "0".repeat(Math.max(Math.floor((boardSize - 7) / 2), 0)) +
                "YOU WIN" +
                "0".repeat(Math.max(Math.ceil((boardSize - 7) / 2), 0))
            ).split("");

            printBoard(board);

            console.log("score: ", player.body.length);

            return process.exit();
        }
    }

    player.body.forEach(({ x, y }) => {
        board[y][x] = 1;
    });

    board[food.y][food.x] = 2;

    printBoard(board);

    board.splice(0, boardSize, ...new Array(boardSize).fill(undefined).map((_, i) => new Array(boardSize).fill(0)));

    return setTimeout(loop, 1000 / 3);
}

loop();

function printBoard(board: any[][]) {
    console.log(board.map((row) => row.map((cell: number) => toAscii[cell] || cell).join("")).join("\n"));
}
