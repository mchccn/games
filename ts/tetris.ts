import chalk from "chalk";
//@ts-ignore
import keypress from "keypress";
import yargs from "yargs";

keypress(process.stdin);

interface Player {
    matrix: number[][];
    pos: { x: number; y: number };
    score: number;
}

(async () => {
    const opts = yargs
        .help()
        .option("color", {
            alias: "c",
            description: "enables/disables color",
            type: "boolean",
        })
        .option("speed", {
            alias: "s",
            description: "sets drop speed",
            type: "number",
        })
        .option("fps", {
            alias: "f",
            description: "sets fps",
            type: "number",
        })
        .parseSync();

    const { supportsColor } = chalk;

    const tetris = `\
        ████████╗███████╗████████╗██████╗ ██╗███████╗
        ╚══██╔══╝██╔════╝╚══██╔══╝██╔══██╗██║██╔════╝
        ██║   █████╗     ██║   ██████╔╝██║███████╗
        ██║   ██╔══╝     ██║   ██╔══██╗██║╚════██║
        ██║   ███████╗   ██║   ██║  ██║██║███████║
        ╚═╝   ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚══════╝`;

    console.clear();

    console.log(supportsColor ? chalk.red(tetris) : tetris);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.clear();

    function arenaSweep() {
        let rowCount = 1;

        outer: for (let y = arena.length - 1; y > 0; --y) {
            for (let x = 0; x < arena[y].length; ++x) {
                if (arena[y][x] === 0) {
                    continue outer;
                }
            }

            const row = arena.splice(y, 1)[0].fill(0);

            arena.unshift(row);

            ++y;

            player.score += rowCount * 10;
            rowCount *= 2;
        }
    }

    function collide(arena: number[][], player: Player) {
        const m = player.matrix;
        const o = player.pos;

        const d = player.matrix.reduce((d, r, i) => (r.every((v) => v === 0) ? i : d), player.matrix.length);

        if (player.pos.y + d > arena.length) return true;

        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 && arena[y + o.y] && arena[y + o.y][x + o.x] !== 0) {
                    return true;
                }
            }
        }

        return false;
    }

    function createMatrix(w: number, h: number) {
        const matrix = [];

        while (h--) {
            matrix.push(new Array(w).fill(0));
        }

        return matrix;
    }

    function createPiece(type: "I" | "L" | "J" | "O" | "Z" | "S" | "T") {
        return {
            I: [
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
            ],
            L: [
                [0, 2, 0],
                [0, 2, 0],
                [0, 2, 2],
            ],
            J: [
                [0, 3, 0],
                [0, 3, 0],
                [3, 3, 0],
            ],
            O: [
                [4, 4],
                [4, 4],
            ],
            Z: [
                [5, 5, 0],
                [0, 5, 5],
                [0, 0, 0],
            ],
            S: [
                [0, 6, 6],
                [6, 6, 0],
                [0, 0, 0],
            ],
            T: [
                [0, 7, 0],
                [7, 7, 7],
                [0, 0, 0],
            ],
        }[type];
    }

    function drawMatrix(matrix: number[][]) {
        const top = "┌" + "─".repeat(matrix[0].length * 2) + "┐";
        const side = supportsColor ? chalk.bold("│") : "│";
        const bottom = "└" + "─".repeat(matrix[0].length * 2) + "┘";

        console.log(supportsColor ? chalk.bold(top) : top);

        console.log(matrix.map((row) => side + row.map((value) => (value ? colors[value - 1].repeat(2) : "  ")).join("") + side).join("\n"));

        console.log(supportsColor ? chalk.bold(bottom) : bottom);
    }

    function printScore() {
        if (supportsColor) console.log(chalk.bold(`score:`), chalk.yellow(player.score));
        else console.log(`score:`, player.score.toString());
    }

    function draw() {
        console.clear();

        console.log(supportsColor ? chalk.red(`TETRIS`) : `TETRIS`);

        printScore();

        const output = [...arena.map((row) => [...row])];

        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    try {
                        output[y + player.pos.y][x + player.pos.x] = value;
                    } catch {}
                }
            });
        });

        drawMatrix(output);
    }

    function merge(arena: number[][], player: Player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    arena[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    function rotate(matrix: number[][], dir: number) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }

        if (dir > 0) {
            matrix.forEach((row) => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    function playerPlace() {
        while (!collide(arena, player)) {
            player.pos.y++;
        }

        player.pos.y--;

        dropCounter = dropInterval;
    }

    function playerDrop() {
        player.pos.y++;

        if (collide(arena, player)) {
            player.pos.y--;
            merge(arena, player);
            playerReset();
            arenaSweep();
        }

        dropCounter = 0;
    }

    function playerMove(offset: number) {
        player.pos.x += offset;

        if (collide(arena, player)) {
            player.pos.x -= offset;
        }
    }

    function playerReset() {
        const pieces = "TJLOSZI";

        player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0] as Parameters<typeof createPiece>[0])!;
        player.pos.y = 0;
        player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

        if (collide(arena, player)) {
            console.clear();

            printScore();

            process.exit();
        }
    }

    function playerRotate(dir: number) {
        const pos = player.pos.x;
        let offset = 1;

        rotate(player.matrix, dir);

        while (collide(arena, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));

            if (offset > player.matrix[0].length) {
                rotate(player.matrix, -dir);
                player.pos.x = pos;
                return;
            }
        }
    }

    const dropInterval = opts.speed ?? 1000;

    let dropCounter = 0;

    function update() {
        dropCounter += dropInterval / fps;

        if (dropCounter > dropInterval) {
            playerDrop();
        }

        draw();
    }

    process.stdin.on("keypress", (_, key) => {
        if (key.name === "left") playerMove(-1);
        else if (key.name === "right") playerMove(1);
        else if (key.name === "down") playerDrop();
        else if (key.name === "up") playerPlace();
        else if (key.name.toLowerCase() === "q") playerRotate(-1);
        else if (key.name.toLowerCase() === "w") playerRotate(1);
        else if (key.name.toLowerCase() === "c" && key.ctrl) process.exit();
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const colors =
        supportsColor && !opts.color
            ? [chalk.bgBlue(" "), chalk.bgGreenBright(" "), chalk.bgRedBright(" "), chalk.bgMagenta(" "), chalk.bgYellowBright(" "), chalk.bgCyan(" "), chalk.bgGray(" ")]
            : ["#", "#", "#", "#", "#", "#", "#"];

    const arena = createMatrix(12, 20);

    const player: Player = {
        matrix: [],
        pos: { x: 0, y: 0 },
        score: 0,
    };

    playerReset();

    const fps = opts.fps ?? 60;

    setInterval(update, 1000 / fps);
})();
