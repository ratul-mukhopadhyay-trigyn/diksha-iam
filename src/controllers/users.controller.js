const {
  createUser,
  formatUserForResponse,
  formatWriteResponseFields,
  getUser,
  parseBooleanQueryFlag,
  softDeleteUser,
  updateUser,
} = require('../services/users.service');

function setNoStoreHeaders(res) {
  res.set({
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  });
}

async function createUserHandler(req, res, next) {
  try {
    const isEncrypted = parseBooleanQueryFlag(req.query.isEncrypted, 'isEncrypted');
    const result = await createUser(req.body);
    const responseFields = formatWriteResponseFields(
      { email: result.email, username: result.username },
      isEncrypted,
    );
    setNoStoreHeaders(res);
    res.status(201).json({
      message: 'User created successfully.',
      userId: result.userId,
      ...responseFields,
    });
  } catch (err) {
    next(err);
  }
}

async function getUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { email, phone } = req.query;
    const isEncrypted = parseBooleanQueryFlag(req.query.isEncrypted, 'isEncrypted');
    const user = await getUser({ id, email, phone });
    setNoStoreHeaders(res);
    res.status(200).json({ user: formatUserForResponse(user, isEncrypted) });
  } catch (err) {
    next(err);
  }
}

async function updateUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    const result = await updateUser(id, req.body);
    setNoStoreHeaders(res);
    res.status(200).json({
      message: 'User updated successfully.',
      userId: result.userId,
      updatedFields: result.updatedFields,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    const result = await softDeleteUser(id);
    setNoStoreHeaders(res);
    res.status(200).json({
      message: 'User deleted successfully.',
      userId: result.userId,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUserHandler,
  deleteUserHandler,
  getUserHandler,
  updateUserHandler,
};
