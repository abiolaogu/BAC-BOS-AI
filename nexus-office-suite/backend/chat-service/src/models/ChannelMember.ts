import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { MemberRole } from '../types';

export class ChannelMember extends Model {
  public id!: string;
  public channelId!: string;
  public userId!: string;
  public role!: MemberRole;
  public lastReadAt?: Date;
  public joinedAt!: Date;
  public mutedUntil?: Date;
  public isMuted!: boolean;
  public isPinned!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ChannelMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    channelId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'channels',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM(...Object.values(MemberRole)),
      defaultValue: MemberRole.MEMBER,
      allowNull: false,
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    mutedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isMuted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'channel_members',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['channelId', 'userId'],
      },
      { fields: ['userId'] },
      { fields: ['role'] },
    ],
  }
);

export default ChannelMember;
