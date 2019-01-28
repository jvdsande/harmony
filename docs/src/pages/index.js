import React from 'react'
import Helmet from 'react-helmet'
import Waypoint from 'react-waypoint'

import Highlight from 'react-highlight'
import 'highlight.js/styles/atom-one-light.css'

import { Link } from 'gatsby'

import Layout from '../components/layout'
import Header from '../components/Header'
import Nav from '../components/Nav'
import Image from '../components/image'

class Index extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      stickyNav: false,
    }
  }

  _handleWaypointEnter= () => {
    this.setState(() => ({ stickyNav: false }))
  }

  _handleWaypointLeave = () => {
    this.setState(() => ({ stickyNav: true }))
  }

  render() {
    return (
      <Layout>
        <Helmet title="Foundation Framework" />

        <Header />

        <Waypoint
          onEnter={this._handleWaypointEnter}
          onLeave={this._handleWaypointLeave}
        />
        <Nav sticky={this.state.stickyNav} />

        <div id="main">

          <section id="intro" className="main">
            <div className="spotlight">
              <div className="content">
                <header className="major">
                  <h2>Introduction</h2>
                  <p>
                    Foundation Framework aims to be a full-featured, easy to use and fully upgradable framework
                    for building fast and reactive web applications.
                  </p>
                </header>
                <p>
                  In this short guide, we will see the principles behind the framework by creating a small app
                  from scratch.
                  The application we'll be building will be a very simple chat room with no security whatsoever.
                </p>
                <p>
                  The Chatroom Example will demonstrate how the framework handles API calls, persistent data, and
                  realtime updates. We will build it in three separate steps :


                  <br />
                  <br />

                  <br />
                  <b>Step 1: Creating the server</b>
                  <br />
                      In this step we will show how Foundation Framework allows us to rapidly setup a production-ready
                      web server, helps us define models for our persistent data, and exposes a ready to use API over a
                      GraphQL endpoint.

                  <br />
                  <br />

                  <b>Step 2: Adding the frontend</b>
                  <br />
                      Once our backend is ready, we will develop a Single-Page Frontend Application using Webpack and
                      React, and connect it to our backend using the Frontend tools provided by Foundation.

                  <br />
                  <br />

                  <b>Step 3: Supercharging the frontend using GatsbyJS</b>
                  <br />
                      Finally, we will take advantage of Foundation modular backend to convert our Frontend to a
                      Gatsby static site, merging the best of the static and dynamic worlds.
                </p>
              </div>
            </div>
          </section>

          <section id="step-1" className="main special">
            <header className="major">
              <h2>Step 1: Creating a server</h2>
              <p>
                The first step of creating a custom web application is to deploy the underlying server app.
                Without further ado, here is how to do it using Foundation Framework.
              </p>
            </header>

            <div style={{ textAlign: 'justify' }}>
              <h2>1.1 - Initialize the app</h2>

              <p>
                First, we will create the NPM package that will be holding our server code.
                Let's call it <b>chatroom-server</b>.
                <br />
                Once created, we will simply add the <b>server</b> package of Foundation Framework.
              </p>
              <pre>
                <code>
                  $ mkdir chatroom-server
                  <br />
                  $ cd chatroom-server
                  <br />
                  $ npm init
                  <br />
                  $ npm install --save @foundationjs/server
                </code>
              </pre>

              <p>
                We will just make one small addition to the above setup allowing us to use the import/export syntax in
                our server code: installing the <b>esm</b> package.
              </p>

              <pre>
                <code>
                $ npm install --save-dev esm
                </code>
              </pre>

              <p>
                Now, instead of launching our server with
                the <code style={{ whiteSpace: 'nowrap' }}>node index.js</code> command, we will simply be able to
                add <code style={{ whiteSpace: 'nowrap' }}>-r esm</code> like so:
                <code style={{ whiteSpace: 'nowrap' }}>node -r esm index.js</code>, and be able to use the
                import/export syntax in our code.
              </p>

              <h2>1.2 - Create an empty server</h2>
              <p>
                Next, let's create the entry point of our app: <b>index.js</b>!
                Here is what it looks like for a minimal setup of Foundation Server:
              </p>

              <Highlight className="javascript">
                {
                  `import Server from '@foundationjs/server'

const server = new Server()

server.init({
  // This is the configuration object of Foundation Server

  // Setup the main endpoint on which our application will be served
  endpoint: {
    host: 'localhost',
    port: 8888,
  },


  // Setup logging to go to the console.
  // If this is not provided, all logging will go into a .log file at the root
  log: {
    console: true,
  },
})`
                }
              </Highlight>

              <p>
                This simple code creates a new Foundation Server instance, and initializes it with the given parameters.
                For now, we simply set the endpoint on which our application needs to be served, and we enable logging
                to be able to track what happens more easily.
              </p>
              <p>
                Running our code using <code>node -r esm index.js</code>, we get the following output, showing that
                Foundation has correctly initialized our server:
              </p>

              <pre>
                <code>
                  {`19/01/16 16:22:16.650 Server            [INFO   ] Powered by
 ______                    _       _   _                    _  _____
|  ____|                  | |     | | (_)                  | |/ ____|
| |__ ___  _   _ _ __   __| | __ _| |_ _  ___  _ __        | | (___
|  __/ _ \\| | | | '_ \\ / _\` |/ _\` | __| |/ _ \\| '_ \\   _   | |\\___ \\
| | | (_) | |_| | | | | (_| | (_| | |_| | (_) | | | | | |__| |____) |
|_|  \\___/ \\__,_|_| |_|\\__,_|\\__,_|\\__|_|\\___/|_| |_|  \\____/|_____/
19/01/16 16:22:16.678 Server            [INFO   ] Initializing Authentications service...
19/01/16 16:22:16.681 Server            [INFO   ] Authentication service initialized successfully
19/01/16 16:22:16.686 Server            [INFO   ] All initialization successful
19/01/16 16:22:16.687 Server            [INFO   ] App running at: http://localhost:8888`}
                </code>
              </pre>


              <p>
                As we can see, the server has correctly booted and is using our given parameters. By default, it does
                nothing else, except setup a basic Authentication system which we will be able to
                take advantage of later.
              </p>


              <h2>1.3 - Adding data persistence</h2>

              <p>
                An application is no use if it cannot store and provide data. In order to do that, Foundation Framework
                provides a simple way of adding a persistence layer: the <b>persistence</b> module!
              </p>
              <p>
                This module allows us to connect a MongoDB database to our application, and expose its data through a
                configurable GraphQL endpoint.
                Let's add it to our new app:
              </p>
              <pre>
                <code>
                  $ npm install --save @foundationjs/persistence
                </code>
              </pre>
              <p>
                Now that we have the package available, all we have to do is configure our persistence instance.
                Let's add it to our <b>index.js</b> file:
              </p>

              <Highlight className="javascript">
                {
                  `import Server from '@foundationjs/server'
import Persistence from '@foundationjs/persistence'

const persistence = new Persistence()

persistence.init({
  // Setup our data models (empty for now)
  models: [],

  // Setup logging to go to the console.
  // If this is not provided, all logging will go into a .log file at the root
  log: {
    console: true,
  },

  // Setup the MongoDB endpoint
  endpoint: 'mongodb://127.0.0.1/chatroom',
})

...

server.init({
  ...

  // Give our persistence instance as a config parameter of our server to expose it
  persistence,
})
`
                }
              </Highlight>

              <p>
                Relaunching our server, we see that Persistence is initialized and connected to our app, but it
                complains about missing models:
              </p>

              <pre>
                <code>
                  {
                  `19/01/16 16:48:27.055 Persistence       [INFO   ] Initializing Persistence
19/01/16 16:48:27.137 Persistence       [ERROR  ] Cannot initialize Persistence without any model!
19/01/16 16:48:27.141 Persistence       [INFO   ] Connecting to Mongo at mongodb://127.0.0.1/chatroom.
19/01/16 16:48:27.174 Server            [INFO   ] Powered by
  ______                    _       _   _                    _  _____
 |  ____|                  | |     | | (_)                  | |/ ____|
 | |__ ___  _   _ _ __   __| | __ _| |_ _  ___  _ __        | | (___
 |  __/ _ \\| | | | '_ \\ / _\` |/ _\` | __| |/ _ \\| '_ \\   _   | |\\___ \\
 | | | (_) | |_| | | | | (_| | (_| | |_| | (_) | | | | | |__| |____) |
 |_|  \\___/ \\__,_|_| |_|\\__,_|\\__,_|\\__|_|\\___/|_| |_|  \\____/|_____/
19/01/16 16:48:27.223 Server            [INFO   ] Initializing Authentications service...
19/01/16 16:48:27.228 Server            [INFO   ] Authentication service initialized successfully
19/01/16 16:48:27.229 Server            [INFO   ] Persistence found! Adding Socket.IO layer...
19/01/16 16:48:27.230 Persistence       [INFO   ] New Socket.IO service available. Connecting...
19/01/16 16:48:27.230 Persistence       [INFO   ] Socket.IO connected.
19/01/16 16:48:27.231 Server            [INFO   ] Socket.IO layer added successfully.
19/01/16 16:48:27.252 Server            [INFO   ] All initialization successful
19/01/16 16:48:27.253 Server            [INFO   ] App running at: http://localhost:8888
19/01/16 16:48:27.262 Persistence       [INFO   ] Mongo connected.
`}
                </code>
              </pre>
              <p>
                Let's fix that by creating our models! Since we will be making a chatroom, we need at least the
                following models:
                <ul>
                  <li>
                    <b>User:</b> a model handling the user information (display name, customization...)
                  </li>
                  <li>
                    <b>Room:</b> a model defining a room, in which messages will be exchanged
                  </li>
                  <li>
                    <b>Message:</b> a model for saving and loading messages
                  </li>
                </ul>
              </p>

              <p>
                We will start by creating a <b>models</b> folder, in which we will create three subfolders,
                one for each model, and an <b>index.js</b> file for exporting them as an array of models.
              </p>

              <pre>
                <code>
                  $ mkdir models
                  <br />
                  $ mkdir models/users
                  <br />
                  $ mkdir models/rooms
                  <br />
                  $ mkdir models/messages
                  <br />
                  $ touch models/index.js
                </code>
              </pre>

              <p>
                The content of <b>models/index.js</b> should look like this:
              </p>

              <Highlight className="javascript">
                {`import users from './users'
import rooms from './rooms'
import messages from './messages'

export default [
  users,
  rooms,
  messages,
]`}
              </Highlight>

              <p>
                Now, for each model, we will create an <b>index.js</b> file which will hold the configuration of our
                model.
                For instance, the <b>users/index.js</b> file should look like this:
              </p>

              <Highlight className="javascript">
                {
                  `import schema from './schema'

export default {
  name: 'users',
  schema,
}
`
                }
              </Highlight>

              <p>
                Create the same file for all models, simply changing the name property accordingly.
              </p>
              <p>
                Notice how we imported a <b>schema.js</b> file, which does not exist yet. This file will be where we
                define how our data should look like.
                Let's go ahead and create the user's schema.
                A user should have a username used for login, a display name that will be configurable later and used
                in chat sessions, and a color that will be used for their speech bubbles. The username should be unique.
              </p>
              <p>
                This is what such a schema would look like. If you already know <b>Mongoose</b>, you should be familiar
                with its looks.
              </p>

              <Highlight className="javascript">
                {
                  `import { Types } from '@foundationjs/persistence'

export default {
  username: {
    type: Types.String,
    unique: true,
  },
  displayName: Types.String,
  color: Types.String,
}`
                }
              </Highlight>

              <p>
                Nice!
                Now that we defined how our users would look like, let's do the same for the rooms.
                A room is defined entirely by the users in it. It contains a single field, <b>usernames</b>.
              </p>

              <Highlight className="javascript">
                {
                  `import { Types } from '@foundationjs/persistence'

export default {
  usernames: [Types.String],
}`
                }
              </Highlight>

              <p>
                Here again, this is a standard <b>Mongoose</b> format.
                We declare an array of objects which are of type <b>String</b>.
              </p>

              <p>
                Our last model is the <b>message</b> model. A message should have an author, some content, a date, and
                a room in which it was posted. It will look like this:
              </p>

              <Highlight className="javascript">
                {
                  `import { Types } from '@foundationjs/persistence'
import Users from '../users'

export default {
  author: {
    type: Types.ObjectId,
    ref: Users.name,
  },
  room: Types.ObjectId,
  content: Types.String,
  timestamp: Types.Date,
}`
                }
              </Highlight>

              <p>
                <b>Note:</b> notice how both <b>author</b> and <b>room</b> are of type <b>ObjectId</b>, but room has no
                ref.
                That is because we might need to display information about a message's author, but we only care
                about the ID of the room, not its information, to retrieve a message. Using a ref field allows
                Foundation to retrieve the complete document upon request.
              </p>

              <p>
                Now that we have all our model ready, we just need to inject them in <b>index.js</b>:
              </p>

              <Highlight className="javascript">
                {
                  `import Server from '@foundationjs/server'
import Persistence from '@foundationjs/persistence'
import models from './models'

...

persistence.init({
  // Setup our data by injecting the imported models
  models,

  ...
})

...`
                }
              </Highlight>

              <p>
                We can now reboot our server, and this time the persistence module should tell us that our models
                have been initialized correctly, and the server module should take them into account, and create a
                Socket.IO service that persistence will be able to hook into:
              </p>

              <pre>
                <code>
                  {`19/01/18 20:55:13.993 Persistence       [INFO   ] Initializing Persistence
19/01/18 20:55:13.996 Persistence       [INFO   ] Found 3 models. Importing...
19/01/18 20:55:13.999 Persistence       [INFO   ] Model 'Users' imported.
19/01/18 20:55:14.000 Persistence       [INFO   ] Model 'Rooms' imported.
19/01/18 20:55:14.001 Persistence       [INFO   ] Model 'Messages' imported.
19/01/18 20:55:14.032 Persistence       [INFO   ] Adding custom fields to models...
19/01/18 20:55:14.032 Persistence       [INFO   ] Done.
19/01/18 20:55:14.032 Persistence       [INFO   ] Building GraphQL schema...
19/01/18 20:55:14.044 Persistence       [INFO   ] GraphQL schema available.

...

19/01/18 20:57:20.851 Server            [INFO   ] Persistence found! Adding Socket.IO layer...
19/01/18 20:57:20.851 Persistence       [INFO   ] New Socket.IO service available. Connecting...
19/01/18 20:57:20.852 Persistence       [INFO   ] Socket.IO connected.
19/01/18 20:57:20.852 Server            [INFO   ] Socket.IO layer added successfully.`}
                </code>
              </pre>

              <p>
                At this point we are almost done creating our server. All we need to add now is a way to access our
                data.
              </p>
              <p>
                Foundation Framework provides a way to expose a <b>GraphQL</b> endpoint,
                simply by adding the <b>graphql</b> configuration field to our server initialization:
              </p>

              <Highlight className="javascript">
                {
                  `...

server.init({
  ...

  graphql: {
    // Expose GraphQL on /graphql
    graphql: '/graphql',

    // Expose GraphiQL and enable it
    graphiql: '/graphiql',
    enableGraphiQL: true,
  },
})`
                }
              </Highlight>

              <p>
                Reboot your server once again, to see the GraphQL and GraphiQL endpoints being mounted:
              </p>

              <pre>
                <code>
                  {`...

19/01/18 21:15:07.850 Server            [INFO   ] GraphQL config found! Adding GraphQL engine...
19/01/18 21:15:07.850 Server            [INFO   ] GraphQL is using the Persistence instance as schema
19/01/18 21:15:07.857 Server            [INFO   ] GraphQL engine added successfully

...

19/01/18 21:15:07.865 Server            [INFO   ] App running at: http://localhost:8888
19/01/18 21:15:07.865 Server            [INFO   ] GraphQL endpoint at: http://localhost:8888/graphql
19/01/18 21:15:07.866 Server            [INFO   ] Graph(i)QL dashboard at: http://localhost:8888/graphiql`}
                </code>
              </pre>

              <p>
                If you now navigate to <a href="http://localhost:8888/graphiql">http://localhost:8888/graphiql</a>,
                you should be able to see that our models have been imported into a full-blown GraphQL API:
              </p>

              <center>
                <p style={{ width: '100%', maxWidth: '600px', boxShadow: '1px 2px 4px 0 rgba(0, 0, 0, 0.1)' }}>
                  <Image.GraphQL />
                </p>
              </center>

              <h2>1.4 - Adding custom functionality</h2>

              <p>
                We're almost to the point where we can start working on our client side.
                All we have left is writing a few custom fields and queries to make our models easier to use and
                better fit our workcase.
              </p>
              <p>
                Fortunately, the persistence module has just what we need for this:
                the <b>fields</b> parameter when defining models.
              </p>

              <p>
                The things we will be adding are the following:
              </p>
              <p>
                <ul>
                  <li>
                    <b>Add a login query:</b> we should have a login query that allows us to log in with a given
                    username. Since we are building a <i>unsecure</i> chatroom, the login query will also create the
                    user if it does not exist yet.
                  </li>

                  <br />

                  <li>
                    <b>Always return a display name:</b> we will modify the way the <b>displayName</b> property is
                    fetched so that it returns the <b>username</b> if no <b>displayName</b> has been set yet. This way
                    we won't have to care about that on the client side.
                  </li>

                  <br />

                  <li>
                    <b>Identify the connected user:</b> calling a query updating the user should not require an ID
                    filter, since we know which user is connected. The same applies when posting a new message.
                  </li>

                  <br />

                  <li>
                    <b>Automatically add timestamps:</b> our messages have timestamps. We will make it so that the
                    timestamp is automatically added by the server when we post a new message.
                  </li>
                </ul>
              </p>

              <p>
                But first, let's talk a bit about the <b>fields</b> parameter. This parameter is our entry point for
                adding custom fields to our GraphQL schema. Using it, we can choose to extend our models by adding new,
                virtual fields that we will be able to read just like any other field. We can also extend the root Query
                and Mutation objects of our GraphQL schema, either by adding custom queries and mutations, or by
                overriding the ones generated by Foundation.
              </p>

              <p>
                The <b>fields</b> parameter is a function returning a configuration object. The returned object has the
                following shape:
              </p>

              <Highlight className="javascript">
                {`{
  fields: { // Definition of new fields to add to our model
    customField: // Definition of the 'customField' field
  },

  queries: { // Definition of new queries to add to the GraphQL schema
    customQuery: // Definition of the 'customQuery' query
  },

  mutations: { // Definition of new mutations to add to the GraphQL schema
    customMutation: // Definition of the 'customMutation' mutation
  },
}`}
              </Highlight>

              <p>
                Let's see those fields in action by implementing the logic described above.
              </p>

              <h3>Adding a login query</h3>

              <p>
                We will add the login query in the <b>users</b> model fields modifier. For queries and mutations, it
                does not matter which model adds them, but it is a better practice to keep concerns together.
              </p>
              <p>
                Let's add a <b>fields.js</b> file in the <b>models/users</b> directory.
                We will then import it in <b>models/users/index.js</b> and add it to the configuration:
              </p>

              <Highlight className="javascript">
                {`import schema from './schema'
import fields from './fields'

export default {
  name: 'users',
  schema,
  fields,
}
`}
              </Highlight>

              <p>
                As said earlier, the field file should export a function, which in turn must return an object containing
                (optional) <b>fields</b>, <b>queries</b> and <b>mutations</b> keys. For now, we'll create the
                following <b>query</b>:
              </p>

              <Highlight className="javascript">
                {`export default () => ({
  queries: {
    login: {
      type: 'String',
      args: {
        username: 'String',
      },
      resolve: async ({ args, composers: { User }, context: { authentication } }) => {
        let user = await User.get({ username: args.username })

        if (!user) {
          const created = await User.create({ username: args.username })

          user = created.record
        }

        return authentication.create(
          { _id: user._id },
        )
      },
    },
  },
})`}
              </Highlight>

              <p>
                To learn more about the <b>queries</b>, <b>mutations</b> and <b>fields</b> format,
                refer to the <Link to="api">API reference</Link>.
              </p>

              <p>
                The query here is straightforward: we use the <b>User composer</b> to get access to
                our <b>users</b> model. We first try to get our user, then we create it if it does not exist yet.
                We then use the <b>authentication</b> object provided in the resolver context by Foundation to create
                a new authentication token, which we send back to the client as a response.
              </p>

              <h3>Always returning a display name</h3>

              <p>
                For this next rule, we will modify the way the <b>displayName</b> field is retrieved. This is done
                by adding a <b>fields</b> key to our configuration object. By convention, we add it before
                the <b>queries</b> key.
              </p>

              <Highlight className="javascript">
                {`export default () => ({
  fields: {
    displayName: {
      type: 'String',
      needs: { username: true, displayName: true },
      resolve: async ({ source }) => source.displayName || source.username,
    },
  },

  queries: {
    ...
  }
})`}
              </Highlight>

              <p>
                The format here is similar to the one we used to create a query. We define a <b>displayName</b> field,
                which needs the <b>username</b> and <b>displayName</b> of the original database object. The resolver
                function then returns the display name, and if it does not exist, it returns the username.
              </p>

              <p>
                Notice how we called our field <b>displayName</b> even though this field already existed on our model.
                Doing so, we actually overrode the way GraphQL resolves the field. It is not possible anymore to get an
                empty display name.
                We could have decided to name our field differently, for instance <b>resolvedName</b>. Doing so,
                the <b>displayName</b> field would have been left untouched, and a read-only <b>resolvedName</b> field
                would have been added to our model.
              </p>

              <h3>Identifying the connected user</h3>

              <p>
                When creating our login query, we created a token containing the user's ID. Now, we will take advantage
                of this token and automatically retrieve the ID whenever the <b>update user mutation</b> is called.
              </p>

              <p>
                In order to do this, we'll add a <b>mutations</b> key to our configuration object. By convention, we add
                it right after the <b>queries</b> key.
              </p>

              <Highlight className="javascript">
                {`export default ({ typeComposers: { UserTC } }) => ({
  ...

  mutations: {
    userUpdate: {
      extends: UserTC.update,
      resolve: async ({ args, composers: { User }, context: { authentication } }) => {
        // Retrieve the ID from the authentication object
        const userId = authentication.get()._id

        // Call the User update method with updated arguments
        return User.update({
          ...args.record,
          _id: userId,
        })
      },
    },
  },
})
`}
              </Highlight>

              <p>
                In this mutation query, we simply intercept the <b>userUpdate</b> query and inject the connected user's
                ID into the <b>User.update</b> call.
              </p>

              <p>
                We also slightly modified the exported function by adding a <b>typeComposers</b> argument, which allows
                us to get type information about our composers. Using this type information, we are able to simply
                extends the update method to create our new one, this way we keep the arguments and return type
                definition generated by Foundation.
              </p>

              <h3>Automatically adding timestamps</h3>

              <p>
                Our <b>messages</b> model has a timestamp field. In order to automate the creation of
                those timestamps, we need to create a <b>fields.js</b> file the <b>messages</b> model,
                and inject them just like we did for the <b>users</b> model.
                Once this is done, we will be modifying mutations to include our timestamps.
              </p>

              <p>
                For <b>messages</b>, we need to keep the creation timestamp and as such, we will modify
                the <b>createMessage</b> mutation. We also need to add the connected user as the author.
              </p>

              <Highlight className="javascript">
                {`export default ({ typeComposers: { MessageTC } }) => ({
  mutations: {
    messageCreate: {
      extends: MessageTC.create,
      resolve: async ({ args, composers: { Message }, context: { authentication } }) => {
        // Get the current user
        const userId = authentication.get()._id

        // Get the current timestamp
        const timestamp = new Date().toISOString()

        // Call the Message create method with updated arguments
        return Message.create({
          ...args.record,
          timestamp,
        })
      },
    },
  },
})`}
              </Highlight>

              <h3>Finalizing: patching the room fields</h3>
              <p>
                In order to have a fully working backend, we simply need to update our <b>room</b> model so that we
                can retrieve and create a room based on its list of users. To do this, we will modify
                the <b>get room</b> query as follow, after creating and injecting a <b>fields.js</b> file for
                the <b>room</b> model.
              </p>

              <Highlight className="javascript">
                {`export default ({ typeComposers: { RoomTC } }) => ({
  queries: {
    room: {
      extends: RoomTC.get,
      resolve: async ({ args, composers: { Room, User }, context: { authentication } }) => {
        // Get the current user object
        const user = await User.get({ _id: authentication.get()._id })

        // Update the list of users accordingly, make it into a set so no user appear twice,
        // and sort it so that it's always the same no matter the connected user
        const usernames = [new Set([...args.filter.usernames, user.username])].sort()

        // Get the required room object
        const room = await Room.get({
          usernames,
        })

        // Create the room if it does not exist
        if (!room) {
          const created = await Room.create({
            usernames,
          })

          return created.record
        }

        return room
      },
    },
  },
})
`}
              </Highlight>


              <p>
                And that's it! We've prepared all the groundwork for our chatroom application. From there, we will be
                able to focus on the client side, and we can leave the backend alone. You can already fiddle with the
                GraphiQL editor at <a href="http://localhost:8888/graphiql">http://localhost:8888/graphiql</a> to see
                how our modified fields and queries act.
              </p>
            </div>
          </section>

          <section id="step-2" className="main special">
            <header className="major">
              <h2>Step 2: Adding a frontend</h2>
              <p>
                Now that we have our working server, we will add a frontend application connecting to it. For this
                example, we will create an SPA using <b>create-react-app</b>.
              </p>
            </header>

            <div style={{ textAlign: 'justify' }}>
              <h2>2.1 - Initialize the app</h2>

              <p>
                Let's go ahead and create our SPA. We will call it <b>chatroom-spa</b>. To create it, run the following
                commands:
              </p>

              <pre>
                <code>
                  $ npx create-react-app chatroom-spa
                  <br />
                  $ cd chatroom-spa
                </code>
              </pre>

              <p>
                We can now launch our app using the <code>npm start</code> command.
              </p>

              <p>
                This will launch our SPA on port 3000 by default. In order to simplify our development experience and
                not get tangled in many different hosts, we will tell our server to also serve our SPA on a given path.
                Since <b>create-react-app</b> applications are designed to work on path <b>/</b>, we will tell our
                server to serve it on this path.
              </p>

              <p>
                To do this, we need to slightly modify our server initialization to tell it to serve an SPA. This is
                done by passing it a configured <b>controller</b>. Controllers are small piece of server code that
                handle route accesses. For instance, when we gave our initialization process the GraphQL configuration
                key, it instantiated an internal controller for handling GraphQL-related routes.
              </p>

              <p>
                We will now be adding the SPA controller. As SPA are really common web applications, the SPA controller
                is directly shipped with the server package. We can simply import it through:
              </p>

              <Highlight className="javascript">
                import Server, {'{ ControllerSPA }'} from '@foundationjs/server'
              </Highlight>

              <p>
                We then add a <b>controllers</b> key to our server configuration object, and we instantiate our
                SPA Controller with the following parameters:
              </p>

              <Highlight className="javascript">
                {`server.init({
  ...

  controllers: [
    new ControllerSPA({
      // Serve our SPA on '/'
      path: '/',
      // Use development mode by default
      forceStatic: false,

      // Our static files are located in the 'public' folder of the 'chatroom-spa' package
      statics: {
        dir: path.resolve(__dirname, '../chatroom-spa/public/'),
        path: '/',
      },

      // In development, we need to proxy our request to the Hot-Module-Replacement server
      // launched by create-react-app, on port 3000
      hmr: {
        endpoint: 'localhost',
        port: 3000,
      },
    }),
  ],
})`}
              </Highlight>

              <p>
                And that's it! Relaunch your server, navigate
                to <a href="http://localhost:8888">http://localhost:8888</a> and you should see your new React
                application ready!
              </p>

              <h3>2.2 - Install dependencies</h3>

              <p>
                Now is the time to add the dependencies our application will be needing. Since we are building a really
                simple app, we will only be needing two dependencies: <b>@reach/router</b> for handling our client-side
                routes, and <b>@foundationjs/query</b> for handling queries from the client to our Foundation
                server. Go ahead and install them:
              </p>

              <pre>
                <code>
                  npm install --save @reach/router @foundationjs/query
                </code>
              </pre>

              <h3>2.3 - Defining the needed routes</h3>

              <p>
                It's time to start building our actual application! To get started, we will define the following routes:
              </p>

              <ul>
                <li>
                  <b>/</b>: will show a login page or redirect to <b>/chat</b> if already logged in.
                </li>

                <br />

                <li>
                  <b>/chat</b>: will show a chat box connected to the global room (all users)
                </li>

                <br />

                <li>
                  <b>/chat/{'{users*}'}</b>: will show a chat box connected to a room with the connected user and the
                  user(s) specified as path variables.
                </li>

                <br />

                <li>
                  <b>/chat/profile</b>: allow the connected user to update it's profile information: color and display
                  name.
                </li>
              </ul>

              <p>
                Modify your <b>App.js</b> to look like this:
              </p>

              <Highlight className="javascript">
                {`import React from 'react';
import { Router } from '@reach/router'
import Query from '@foundationjs/query'

import './App.css'

import Login from './pages/login'
import GlobalRoom from './pages/global-room'
import UserRoom from './pages/user-room'
import UserProfile from './pages/user-profile'

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <Router>
          <Login path="/" />
          <GlobalRoom path="/chat" />
          <UserRoom path="/chat/*" />
          <UserProfile path="/chat/profile" />
        </Router>
      </div>
    );
  }
}

export default () => (
  <Router>
    <App default />
  </Router>
)
`}
              </Highlight>

              <p>
                Don't forget to create the <b>pages</b> folder and the four components. For now the components will
                simply return <b>null</b>:
              </p>

              <Highlight className="javascript">
                {`import React from 'react'

export default class Login extends React.Component {
  render() {
    return null
  }
}
`}
              </Highlight>

              <h3>
                2.4 - Create our login page
              </h3>

              <p>
                Our very simple login page will look as follow:
              </p>

              <Highlight className="javascript">
                {`import React from 'react'
import Query from '@foundationjs/query'
import { navigate } from '@reach/router'

export default class Login extends React.Component {
  state = {
    username: ''
  }

  onSubmit = (e) => {
    e.preventDefault()

    if(this.state.username.trim() !== '') {
      Query.query({
        login: {
          args: {
            username: this.state.username
          },
        }
      }).then(({ login: token }) => {
        Query.configure({ token })
        window.localStorage.setItem('token', token)
        navigate('/chat')
      })
    }
  }

  handleUsernameChange = (e) => {
    this.setState({
      username: e.target.value
    })
  }

  render() {
    return (
      <div id="login">
        <form onSubmit={this.onSubmit}>
          <label htmlFor="username">Username:</label>
          <input type="text" name="username" value={this.state.username} onChange={this.handleUsernameChange} />
          <button type="submit">Login</button>
        </form>
      </div>
    )
  }
}
`}
              </Highlight>

              <p>
                The login page contains a simple login form asking for a username. Upon submit, we use the Foundation
                Query module to launch our <b>login</b> query. This query is the one we created earlier, which takes
                a username and returns a token. We then simply store the token into our local storage, and navigate to
                <b>/chat</b>
              </p>

              <p>
                Right before storing the token in the local storage, we pass it into
                the <b>Query.configure</b> function.
                This tells the Query module how to authenticate when querying our server.
              </p>

              <p>
                Since once logged in, we will not go through this step every time, we need to add a bit of logic at the
                loading of the page. Let's add a <b>constructor</b> lifecycle hook to our main component:
              </p>

              <Highlight className="javascript">
                {`import React from 'react';
import { Router, navigate } from '@reach/router'

...

class App extends React.Component {
  constructor() {
    super()

    // Check if the token is available in local storage
    const token = window.localStorage.getItem('token')

    Query.configure({
      token
    })

    if(token) {
      if(!window.location.pathname.startsWith('/chat')) {
        navigate('/chat')
      }
    } else {
      navigate('/')
    }
  }

  ...
}

export default App
`}
              </Highlight>

              <p>
                Sweet! We now have a working login logic! We can now proceed to creating the chatbox, which will
                connect to the rooms and display messages.
              </p>

              <h3>2.5 - Creating the Chatbox component</h3>

              <p>
                Go ahead and create a <b>components</b> folder next to your <b>pages</b> folder.
                Then, add a <b>chatbox.jsx</b> component in it.
              </p>

              <p>
                Our chatbox should look like this:
              </p>

              <Highlight className="javascript">
                {`import React from 'react'

export default class Chatbox extends React.Component {
  state = {
    messages: [],
    message: '',
    room: null,
  }

  handleMessageUpdate = (e) => {
    this.setState({
      message: e.target.value
    })
  }

  sendMessage = (e) => {
    e.preventDefault()

    // Handle send message here

    this.setState({
      message: ''
    })
  }

  render() {
    const { users } = this.props

    return (
      <div>
        <h1>
          Chatbox with {this.props.users ? users.join(', ') : 'everyone' }
        </h1>

        <div className="messages">
          {
            this.state.messages.map(message => {
              const { content, author, timestamp } = message

              return (
                <div className={"message " + author.color}>
                  <h2 className="author">{author.displayName}</h2>
                  <p className="content">{content}</p>
                  <p className="date">{new Date(timestamp).toLocaleDateString()} - {new Date(timestamp).toLocaleTimeString()}</p>
                </div>
              )
            })
          }
        </div>

        <form onSubmit={this.sendMessage}>
          <input
            type="text"
            value={this.state.message}
            onChange={this.handleMessageUpdate}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    )
  }
}
`}
              </Highlight>

              <p>
                As we can see, the Chatbox component displays a list of messages (not fetched yet), and the list of
                users in the room. If no user are specified, it defaults to a room with everyone. We can already use
                this component by adding it to our GlobalRoom and UserRoom pages:
              </p>

              <Highlight>
                {`/* global-room.jsx */
import React from 'react'
import Chatbox from '../components/chatbox'

export default class GlobalRoom extends React.Component {
  render() {
    return (
      <Chatbox/>
    )
  }
}


/* user-room.jsx */
import React from 'react'
import Chatbox from '../components/chatbox'

export default class UserRoom extends React.Component {
  render() {
    const { '*': users} = this.props
    return (
      <Chatbox users={users.split('/')}/>
    )
  }
}`}
              </Highlight>

              <p>
                Alright! Now is the time to connect the state on our chatbox component. We will be using
                the <b>query</b> module that we installed and configure to retrieve the chatroom and the messages
                associated to it. We will add a <b>retrieveRoomAndMessages</b> function to our component, which we will
                call in the <b>componentDidMount</b> lifecycle hook.
              </p>

              <p>
                But first, let's talk about the <b>query</b> module's <b>Controller</b> constructor. This constructor
                allows us to create structures to easily access our models. Let's import it and create a controller for
                our <b>rooms</b> and <b>messages</b>.
              </p>

              <Highlight className="javascript">
                {`import React from 'react'
import { Controller } from '@foundationjs/query'

const RoomController = new Controller('room')
const MessageController = new Controller('message')

export default class Chatbox extends React.Component {
  ...
}`}
              </Highlight>

              <p>
                Using our new controllers, we can write our <b>retrieveRoomAndMessages</b> function.
              </p>

              <Highlight className="javascript">
                {`  componentDidMount() {
    this.retrieveRoomAndMessages()
  }

  retrieveRoomAndMessages = async () => {
    const { users } = this.props

    let room = null
    if(users) {
      room = await RoomController.query
        .get()
        .where({
          usernames: this.props.users,
        })
        .select({
          _id: true,
        })
    }

    this.setState({ room })

    MessageController.query
      .list()
      .where({
        room: room ? room._id : null,
      })
      .select({
        author: {
          displayName: true,
          color: true,
        },
        content: true,
        timestamp: true,
      })
      .subscribe((messages) => {
        this.setState({ messages })
      })
  }`}
              </Highlight>

              <p>
                As we can see, each controller exposes a <b>query</b> object in which the three query functions (get,
                list and count) are made available. We define our filter arguments using <b>where()</b>, and we select
                the fields we need using <b>select()</b>.
              </p>

              <p>
                Each query made through a controller can then be used as a Promise, like we do with the room query,
                or be subscribed to so that the callback is called each time the underlying data changes, as we do with
                the messages.
              </p>

              <p>
                With those simple queries, we've actually built a real-time chatbox, since the messages state will be
                updated at every new message in the room!
              </p>

              <p>
                All that is left to add is a way to post a message. This can be done through another object exposed by
                the controller: <b>mutate</b>. We will add it to the <b>sendMessage</b> function.
              </p>

              <Highlight className="javascript">
                {`  sendMessage = async (e) => {
    e.preventDefault()

    await MessageController.mutate
      .create()
      .withContent({
        content: this.state.message,
        room: this.state.room ? this.state.room._id : undefined,
      })

    this.setState({
      message: ''
    })
  }`}
              </Highlight>

              <p>
                The <b>mutate</b> object allows us to call the various mutations: create, createMany, update and delete.
              </p>

              <h3>2.6 - The profile page</h3>

              <p>
                Work in progress...
              </p>
            </div>
          </section>

          <section id="step-3" className="main special">
            <header className="major">
              <h2>Step 3: Supercharging the frontend using GatsbyJS</h2>
              <p>
                <center>Work in Progress...</center>
              </p>
            </header>
            <p />
          </section>

        </div>

      </Layout>
    )
  }
}

export default Index
