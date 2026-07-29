# Build instructions

1. install `yarn`:
    ```
    brew install yarn
    ```
    > https://yarnpkg.com/lang/en/docs/install/

2. install dependency packages:
    ```
    yarn
    ```

3. build code:
    ```
    make
    ```

# Developing instructions

1. install `yarn`:
2. install dependency packages:
3. upgrade shared component(optional):
    ```
    make upgrade-gitlab
    ```
4. watch code:
    ```
    make watch
    ```
# Developing bookmark

1. In webide enter the following code:
    ```
    const activity = new WebActivity({
        name: 'bookmark',
        data: {
            action: String, // Type String ('get', 'add', 'remove', 'getAll')
            url: 'https://developer.kaiostech.com', // Type String
            name: 'KaiOS', // Type String
            icon: '', // Type String
        }
    });

    activity.start()
        .then((evt) => console.log('success', evt))
        .catch((evt) => console.log('err', evt));
    ```
2. Check App Menu, show bookmark.