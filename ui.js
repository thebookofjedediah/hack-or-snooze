$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $favoriteStories = $("#favorited-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $navFavorites = $("#nav-favorites");
  const $navStories = $("#nav-stories");
  const $navProfile = $("#nav-profile");
  const $myProfile = $("#user-profile");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

/**
   * toggle from and other things when submitting an article
   */

  $navSubmit.on("click", function() {
      hideElements();
      $allStoriesList.show();
      $submitForm.slideToggle();
  });

  /**
   * submit form for new post handler
   */
  $submitForm.on('submit', async function(e){
    e.preventDefault();
    let title = $("#title").val();
    let author = $("#author").val();
    let url = $("#url").val();
    let username = currentUser.username;
    const hostName = getHostName(url);


    const storyObject = await storyList.addStory(currentUser, {
      title,
      author,
      url,
      username
    });

    await generateStories();
    $allStoriesList.show();

    // reset the form
    $submitForm.trigger("reset");
  })

    /**
   * Showing favorites via button
   */
  $navFavorites.on('click', function(e){
    e.preventDefault();
    hideElements();
    generateFavorites();
    $allStoriesList.hide();
    $favoriteStories.show();
  })

      /**
   * Showing favorites via button
   */
  $navProfile.on('click', function(e){
    e.preventDefault();
    hideElements();
    showMyProfile();
  })

      /**
   * Showing my stories via button
   */
  $navStories.on('click', function(e){
    e.preventDefault();
    hideElements();
    generateMyStories();

  })

    /**
   * Event Handler for Deleting a Single Story
   */

  $ownStories.on("click", ".trash-can", async function(evt) {
    // get the Story's ID
    const $closestLi = $(evt.target).closest("li");
    const storyId = $closestLi.attr("id");

    // remove the story from the API
    await storyList.removeStory(currentUser, storyId);

    // re-generate the story list
    await generateStories();

    // hide everyhing
    hideElements();

    // ...except the story list
    $allStoriesList.show();
  });

    /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateFavorites() {
    // empty out that part of the page
    $favoriteStories.empty();

    // loop through all of our favorite stories and generate HTML for them
    for (let story of currentUser.favorites){
      let favoritesList = generateStoryHTML(story, false, true);
      $favoriteStories.append(favoritesList);  
   }
  }

    /**
   * adding favorites
   */

  $(".articles-container").on("click", ".star", async function(evt) {
    if (currentUser) {
      const $tgt = $(evt.target);
      const $closestLi = $tgt.closest("li");
      const storyId = $closestLi.attr("id");

      // if the item is already favorited
      if ($tgt.hasClass("fas")) {
        // remove the favorite from the user's list
        await currentUser.removeFavorite(storyId);
        // then change the class to be an empty star
        $tgt.closest("i").toggleClass("fas far");
      } else {
        // the item is un-favorited
        await currentUser.addFavorite(storyId);
        $tgt.closest("i").toggleClass("fas far");
      }
    }
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

    /**
   * get current user data and display in the DOM 
   */

  function showMyProfile() {
    // show your name
    $("#profile-name").text(`Name: ${currentUser.name}`);
    // show your username
    $("#profile-username").text(`Username: ${currentUser.username}`);
    // format and display the account creation date
    $("#profile-account-date").text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    $myProfile.show();
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far";

    // render a trash can for deleting your own story
    const trashCanIcon = isOwnStory
      ? `<span class="trash-can">
          <i class="fas fa-trash-alt"></i>
        </span>`
      : "";

    // render all the rest of the story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
          </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* see favorite stories */
  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId);
  }

  function generateMyStories() {
    $ownStories.empty();

    // if the user has no stories that they have posted
    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      // for all of the user's posted stories
      for (let story of currentUser.ownStories) {
        // render each story in the list
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
      }
    }

    $ownStories.show();
  }


  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $myProfile,
      $favoriteStories
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
