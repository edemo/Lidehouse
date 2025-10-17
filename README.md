# LiDeHouse

Liquid Democracy comes to your doorsteps.

This software allows you to manage your community with liquid democratic tools,
discussing issues on a forum, making decision with diferent voting methods, delegate your vote to other members in the community.
You can also manage the community's work tasks in a workflow manner, using tickets, following work statuses, everybody being able to comment on the tasks.
It also provides a transparent solution to doing the official accounting of the community.

UPDATE: We are currently adding an internal marketplace. So community members can exchange goods and services with each other.

### Live DEMO: https://demo.honline.hu

### Running the app

```bash
meteor npm install
meteor
```

App in the test mode, is listening on port 3000, and mongo db is istening on 3001

### Running the tests

```bash
meteor npm install
meteor test --once --driver-package meteortesting:mocha --port 3100
```

### Scripts

To lint:

```bash
meteor npm run lint
```
