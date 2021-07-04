import chalk from "chalk";
//@ts-ignore
import keypress from "keypress";
import yargs from "yargs";

keypress(process.stdin);

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

    const centipede = `\
██████╗███████╗███╗   ██╗████████╗██╗██████╗ ███████╗██████╗ ███████╗
██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║██╔══██╗██╔════╝██╔══██╗██╔════╝
██║     █████╗  ██╔██╗ ██║   ██║   ██║██████╔╝█████╗  ██║  ██║█████╗  
██║     ██╔══╝  ██║╚██╗██║   ██║   ██║██╔═══╝ ██╔══╝  ██║  ██║██╔══╝  
╚██████╗███████╗██║ ╚████║   ██║   ██║██║     ███████╗██████╔╝███████╗
 ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝     ╚══════╝╚═════╝ ╚══════╝`;

    console.clear();

    console.log(supportsColor ? chalk.greenBright(centipede) : centipede);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.clear();

    function collide(arena: number[][], target: (number | undefined)[][], offset = { x: 0, y: 0 }) {
        const m = target;
        const o = offset;

        const d = m.reduce((d, r, i) => (r.every((v) => v === 0) ? i : d), m.length);

        if (o.y + d > arena.length || o.y < 0) return true;

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

    function merge(a: number[][], b: (number | undefined)[][], offset = { x: 0, y: 0 }) {
        const o = offset;

        b.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    a[y + o.y][x + o.x] = value;
                }
            });
        });

        return a;
    }

    function drawMatrix(matrix: number[][]) {
        const top = "┌" + "─".repeat(matrix[0].length * 2) + "┐";
        const side = supportsColor ? chalk.bold("│") : "│";
        const bottom = "└" + "─".repeat(matrix[0].length * 2) + "┘";

        return [
            supportsColor ? chalk.bold(top) : top,
            ...matrix.map((row) => side + row.map((value) => (value ? colors[value] : "  ")).join("") + side),
            supportsColor ? chalk.bold(bottom) : bottom,
        ];
    }

    function printScore() {
        if (supportsColor) console.log(chalk.bold(`score:`), chalk.yellow(player.score));
        else console.log(`score:`, player.score.toString());
    }

    function printLives() {
        if (supportsColor) console.log(chalk.bold(`lives:`), chalk.yellow(player.lives));
        else console.log(`lives:`, player.lives.toString());
    }

    function draw() {
        console.clear();

        printScore();

        printLives();

        const output = [...arena.map((row) => [...row])];

        merge(output, [[1]], player);

        player.bullets.forEach((b) => merge(output, [[2]], b));

        console.log(drawMatrix(output).join("\n"));
    }

    function playerMoveX(dir: number) {
        player.x += dir;

        if (collide(arena, [[1]], player)) {
            player.x -= dir;
        }
    }

    function playerMoveY(dir: number) {
        player.y += dir;

        if (collide(arena, [[1]], player)) {
            player.y -= dir;
        }
    }

    function playerShoot() {}

    function update() {
        draw();
    }

    process.stdin.on("keypress", (_, key) => {
        if (!key) return;

        if (key.name === "left") playerMoveX(-1);
        else if (key.name === "right") playerMoveX(1);
        else if (key.name === "up") playerMoveY(-1);
        else if (key.name === "down") playerMoveY(1);
        else if (key.name === "space") playerShoot();
        else if (key.name.toLowerCase() === "c" && key.ctrl) process.exit();
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const width = 25;
    const height = 32;

    const colors =
        supportsColor && !opts.color && !opts.ascii
            ? [
                  " ",
                  chalk.bgCyan(" "),
                  chalk.bgRedBright(" "),
                  chalk.bgGreenBright(" "),
                  chalk.bgMagentaBright(" "),
                  chalk.bgBlue(" "),
                  chalk.bgCyan(" "),
                  chalk.bgYellowBright(" "),
              ].map((c) => c.repeat(2))
            : ["  ", "◢◣", "▕▏", "##", "@@", "&&", "$$", "**"];

    const arena = createMatrix(width, height);

    const player = {
        x: Math.floor(width / 2),
        y: height - 1,
        score: 0,
        bullets: [] as { x: number; y: number; stacked: number; lastTick: number }[],
        lives: 3,
        lastShot: 0,
    };

    const fps = opts.fps ?? 60;

    update();

    setInterval(update, 1000 / fps);
})();
